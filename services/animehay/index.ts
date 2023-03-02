import _ from "lodash";
import puppeteer, { Browser, Page } from "puppeteer";
import GroupModel from "../../models/group";
import PostModel from "../../models/post";
import ServerModel from "../../models/server";
import StalkModel from "../../models/stalk";
import WatchModel from "../../models/watch";

const type = "AnimeHay";

export default async function main() {
  console.log("Đang khởi động...");

  const browser = await puppeteer.launch({ headless: false });

  await getNewData(browser);
  await getPostData(browser);
  await getWatchData(browser);

  await browser.close();
}

async function getNewData(browser: Browser) {
  console.log("Đang lấy dữ liệu mới...");
  const page = await browser.newPage();

  const idUpdated: string[] = [];

  let index = 0;
  let isEnd = false;
  do {
    index += 1;
    const path = `https://animehay.pro/phim-moi-cap-nhap/trang-${index}.html`;
    await page.goto(path);

    if (await page.$(".ah_404")) break;

    const pageData = await page.evaluate(() => {
      const stalkItem = document.querySelectorAll(".movies-list .movie-item");

      const stalkItemArr = Array.from(stalkItem);
      return stalkItemArr.map((stalkItem) => {
        const stalkId = stalkItem.getAttribute("id")?.split("-")?.[2] || "";
        const stalkLink = stalkItem.querySelector("a")?.href || "";
        const stalkName =
          (
            stalkItem.querySelector(".name-movie") as HTMLElement
          )?.innerText.trim() || "";
        const stalkImage = stalkItem.querySelector("img")?.src || "";
        const stalkEpisode =
          (stalkItem.querySelector(".episode-latest") as HTMLElement)
            ?.innerText || "";

        let stalkEpisodeTotal = "";
        let stalkEpisodeCurrent = "";

        stalkEpisodeTotal = stalkEpisode.split("/")?.[1];
        stalkEpisodeCurrent = stalkEpisode.split("/")?.[0];
        if (stalkEpisode.toLowerCase().indexOf("phút") > -1) {
          stalkEpisodeTotal = "1";
          stalkEpisodeCurrent = stalkEpisode;
        }

        return {
          stalkId,
          stalkLink,
          stalkName,
          stalkImage,
          stalkEpisodeTotal,
          stalkEpisodeCurrent,
        };
      });
    });

    await Promise.all(
      pageData.map(async (stalkItem) => {
        const stalk = await StalkModel.findOne({
          type,
          stalkId: stalkItem.stalkId,
        });
        const stalkUd = await StalkModel.findOneAndUpdate(
          { type, stalkId: stalkItem.stalkId },
          { ...stalkItem },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (stalk?.stalkEpisodeCurrent === stalkUd?.stalkEpisodeCurrent) {
          isEnd = true;
          return stalkUd;
        }
        idUpdated.push(`${stalkUd.stalkId}|${stalkUd._id}`);
        const postUd = await PostModel.findOneAndUpdate(
          { type, postId: stalkItem.stalkId },
          {
            isUpdate: true,
            stalkRef: stalkUd._id,
            postName: stalkUd.stalkName,
            postLink: stalkUd.stalkLink,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        stalkUd.postRef = postUd._id;
        return stalkUd.save();
      })
    );
  } while (!isEnd);

  await page.close();

  console.log("Đã lấy xong dữ liệu mới: ", idUpdated.join(", "));
}

async function getPostData(browser: Browser) {
  console.log("Đang lấy dữ liệu bài viết...");

  const postData = await PostModel.find({ type, isUpdate: true }).populate(
    "watchRef"
  );

  const postDataChunks = _.chunk(postData, 5);
  for (const postDataChunk of postDataChunks) {
    let pages = await browser.pages();
    while (pages.length > 5) {
      await new Promise((r) => setTimeout(r, 1000));
      pages = await browser.pages();
    }

    await Promise.race(
      postDataChunk?.map(async (postItem) => {
        const { type, stalk: stalkId, postId, postLink } = postItem;

        if (!postLink) return;
        const page = await browser.newPage();
        await page.goto(postLink);

        if (await page.$(".ah_404")) return;

        const pageData = await page.evaluate(() => {
          const postLink =
            (document.querySelector("link[rel=canonical]") as HTMLAnchorElement)
              ?.href || "";
          const postId = postLink?.split("-")?.pop()?.split(".")[0] || "";
          const postName =
            (document.querySelector(".heading_movie") as HTMLElement)
              ?.innerText || "";
          const postOriginalName =
            (
              document.querySelector(
                ".name_other div:nth-child(2)"
              ) as HTMLElement
            )?.innerText || "";
          const postImage =
            (
              document.querySelector(
                ".heading_movie ~ div img"
              ) as HTMLImageElement
            )?.src || "";

          const postCategoriesSelector =
            document.querySelectorAll(".list_cate div a");
          const postCategories = (
            Array.from(postCategoriesSelector) as HTMLElement[]
          )
            .map((item) => item.innerText.trim())
            .join("|");
          const postTags = postOriginalName
            .split(",")
            .map((item) => item.trim())
            .join("|")
            .split("/")
            .map((item) => item.trim())
            .join("|");
          const postCountry =
            postCategories.indexOf("CN Animation") > -1
              ? "Trung Quốc"
              : "Nhật Bản";

          let postStatus = (
            document.querySelector(".status div:nth-child(2)") as HTMLElement
          )?.innerText.toLowerCase();
          if (postStatus === "đang tiến hành") postStatus = "ongoing";
          else postStatus = "completed";

          const postPublish =
            (
              document.querySelector(
                ".update_time div:nth-child(2)"
              ) as HTMLElement
            )?.innerText || "";
          const postDuration =
            (
              document.querySelector(
                ".duration div:nth-child(2)"
              ) as HTMLElement
            )?.innerText.toLowerCase() || "";
          const postDescription =
            (document.querySelector(".desc div:nth-child(2)") as HTMLElement)
              ?.innerText || "";

          let postType = "movie";
          let postEpisodeTotal = "1";
          if (postDuration.includes("tập")) {
            postType = "series";
            postEpisodeTotal =
              postDuration.split("tập")?.[0].trim() || postDuration;
          }
          const postEpisodeCurrent =
            (document.querySelector(".list-item-episode a") as HTMLElement)
              ?.innerText || "1";

          const postEpisodesSelector = document.querySelectorAll(
            ".list-item-episode a"
          );
          const postEpisodes = (
            Array.from(postEpisodesSelector) as HTMLAnchorElement[]
          )
            .reverse()
            .map((item) => {
              const watchLink = item.href || "";
              const watchId = watchLink?.split("-")?.pop()?.split(".")[0] || "";
              const watchName = item.innerText.trim() || "";
              return { watchId, watchLink, watchName };
            });
          const postGroups = Array.from(
            document.querySelectorAll(".bind_movie .scroll-bar a")
          ).map((item) => {
            const post = item as HTMLAnchorElement;
            const postId = post.href?.split("-")?.pop()?.split(".")[0] || "";
            const postName = post.innerText?.trim() || "";
            const isCurrent = post.classList.contains("active");
            return { isCurrent, postId, postName };
          });

          return {
            postId,
            postLink,
            postName,
            postType,
            postImage,
            postOriginalName,
            postCategories,
            postTags,
            postCountry,
            postStatus,
            postPublish,
            postDuration,
            postDescription,
            postEpisodeTotal,
            postEpisodeCurrent,
            postEpisodes,
            postGroups,
          };
        });

        const { postGroups, postEpisodes } = pageData;

        const updated = await PostModel.findOneAndUpdate(
          { type, postId },
          { stalkRef: stalkId, ...pageData },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const stalkItem = await StalkModel.findById(stalkId);
        if (stalkItem) {
          stalkItem.postRef = updated._id;
          await stalkItem.save();
        }

        if (postGroups.length > 0) {
          let groupItem = await GroupModel.findOne({
            groupItems: {
              $elemMatch: { postId: updated.postId },
            },
          });
          if (!groupItem) groupItem = await new GroupModel();

          const { groupItems } = groupItem;
          if (!groupItems.length || groupItems.length !== postGroups.length)
            groupItem.groupItems.push(...postGroups);

          const groupCurrent = postGroups.find((item: any) => item.isCurrent);
          const groupCurrentIndex = groupItems.findIndex(
            (item: any) => item.postId === groupCurrent?.postId
          );
          if (groupCurrentIndex > -1) {
            groupItem.groupItems[groupCurrentIndex] = {
              ...groupCurrent,
              postRef: updated._id,
            };
          }
          await groupItem.save();
          updated.groupRef = groupItem._id;
        }

        const watchedItems = postItem?.watchRef.reduce(
          (acc: any, item: any) => {
            acc[item.watchId] = item;
            return acc;
          },
          []
        );

        await Promise.all(
          postEpisodes
            .filter((item) => !watchedItems?.[item.watchId])
            .map((item) =>
              WatchModel.create({
                type,
                postRef: updated._id,
                ...item,
              }).then((created) => updated.watchRef.push(created._id))
            )
        );

        updated.isUpdate = false;
        await updated.save();

        await page.close();
      })
    );
  }

  console.log("Đã lấy dữ liệu bài viết xong!");
}

async function getWatchData(browser: Browser) {
  console.log("Đang lấy dữ liệu xem phim...");

  const watchData = await WatchModel.find({ type, isUpdate: true });

  const watchDataChunks = _.chunk(watchData, 5);
  for (const watchDataChunk of watchDataChunks) {
    let pages = await browser.pages();
    while (pages.length > 5) {
      await new Promise((r) => setTimeout(r, 1000));
      pages = await browser.pages();
    }

    await Promise.race(
      watchDataChunk?.map(async (watchItem: any) => {
        const { watchLink } = watchItem;

        if (!watchLink) return;
        const page = await browser.newPage();
        await page.goto(watchLink, {
          timeout: 0,
          waitUntil: "domcontentloaded",
        });
        await new Promise((r) => setTimeout(r, 500));

        if (await page.$(".ah_404")) return;
        if (await page.$("#count-second-unlock")) return;

        /* Server VPRO */
        const svVpx = await page.evaluate(() => {
          const svVpx = document.querySelector("#sv_VPRO") as HTMLElement;
          if (svVpx) svVpx.click();
          return svVpx ? true : false;
        });
        if (svVpx) {
          const server = await ServerModel.findOneAndUpdate(
            { serverName: "VPX" },
            { serverType: "embed", serverName: "VPX" },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          const serverPlayer = await getWatchVideoHls(
            page,
            "https://suckplayer.xyz/video/",
            () =>
              page.evaluate(() => {
                const svVpx = document.querySelector("#sv_VPRO") as HTMLElement;
                svVpx?.click();
              })
          );

          const watchVpx = { serverRef: server._id, serverPlayer };

          const findIndex = watchItem.watchServer.findIndex((item: any) =>
            item.serverRef.equals(server._id)
          );
          if (findIndex > -1) watchItem.watchServer[findIndex] = watchVpx;
          else watchItem.watchServer.push(watchVpx);
        }

        /* Server Hydrax */
        const svHydrax = await page.evaluate(() => {
          const svHydrax = document.querySelector("#sv_Hydrax") as HTMLElement;
          if (svHydrax) svHydrax.click();
          return svHydrax ? true : false;
        });
        if (svHydrax) {
          const server = await ServerModel.findOneAndUpdate(
            { serverName: "HDX" },
            { serverType: "embed", serverName: "HDX" },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          const serverPlayer = await page.evaluate(() => {
            const player = document.querySelector(
              "#video-player iframe"
            ) as HTMLIFrameElement;
            return player?.src || "";
          });

          const watchHydrax = { serverRef: server._id, serverPlayer };

          const findIndex = watchItem.watchServer.findIndex((item: any) =>
            item.serverRef.equals(server._id)
          );
          if (findIndex > -1) watchItem.watchServer[findIndex] = watchHydrax;
          else watchItem.watchServer.push(watchHydrax);
        }

        watchItem.isUpdate = false;
        await watchItem.save();
        await page.close();
      })
    );
  }

  console.log("Đã lấy dữ liệu xem phim xong!");
}

async function getWatchVideoHls(
  page: Page,
  prefix: string,
  callback?: Function
): Promise<string> {
  return new Promise(async (resolve) => {
    page.on(
      "response",
      async (response) =>
        response.url().includes(prefix) && resolve(response.url())
    );
    await callback?.();
    setTimeout(() => resolve(""), 2000);
  });
}
