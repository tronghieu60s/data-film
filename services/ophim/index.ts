import puppeteer, { Browser, Page } from "puppeteer";
import GroupModel from "../../models/group";
import PostModel from "../../models/post";
import ServerModel from "../../models/server";
import StalkModel from "../../models/stalk";
import WatchModel from "../../models/watch";

const type = "OPhim";

export default async function main() {
  console.log("Đang khởi động...");

  await getNewData();
  // await getPostData(browser);

  // await browser.close();
}

async function getNewData() {
  console.log("Đang lấy dữ liệu mới...");
  const idUpdated: string[] = [];

  let index = 0;
  let isEnd = false;
  do {
    index += 1;

    const stalkData = await fetch(
      `https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=${index}`
    ).then((res) => res.json());

    if (!stalkData.data.length) break;

    const stalkResult = stalkData.items.map((item: any) => ({
      stalkId: item?._id,
      stalkLink: `https://ophim1.com/phim/${item?.slug}`,
      stalkName: item?.name,
      stalkImage: item?.thumb_url,
      stalkDiff: item?.modified?.time,
    }));

    await Promise.all(
      stalkResult.map(async (stalkItem: any) => {
        const stalk = await StalkModel.findOne({
          type,
          stalkId: stalkItem.stalkId,
        });
        const stalkUd = await StalkModel.findOneAndUpdate(
          { type, stalkId: stalkItem.stalkId },
          { ...stalkItem },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (stalk?.stalkDiff === stalkUd?.stalkDiff) {
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

  console.log("Đã lấy xong dữ liệu mới: ", idUpdated.join(", "));
}

async function getPostData(browser: Browser) {
  console.log("Đang lấy dữ liệu bài viết...");

  const postData = await PostModel.find({ type, isUpdate: true }).populate(
    "watchRef"
  );

  for (const postItem of postData) {
    const { type, stalk: stalkId, postId, postLink } = postItem;

    if (!postLink) continue;

    const pageData = await fetch(postLink).then((res) => res.json());

    if (!pageData.status) continue;

    const { movie = {}, episodes = [] } = pageData;
    const pageResult = {
      postId: movie?._id,
      postLink: `https://ophim1.com/phim/${movie?.slug}`,
      postName: movie?.name,
      postType: movie?.type,
      postImage: movie?.thumb_url,
      postPoster: movie?.poster_url,
      postOriginalName: movie?.origin_name,
      postCategories: movie?.category?.map((item: any) => item?.name).join("|"),
      postCountry: movie?.country?.map((item: any) => item?.name).join("|"),
      postActors: movie?.actor.map((item: any) => item?.trim()).join("|"),
      postDirectors: movie?.director.map((item: any) => item?.trim()).join("|"),
      postStatus: movie?.status,
      postPublish: movie?.year,
      postQuality: movie?.quality,
      postDuration: movie?.time,
      postDescription: movie?.content,
      postTrailer: movie?.trailer_url,
      postEpisodeTotal: movie?.episode_total,
      postEpisodeCurrent: movie?.episode_current,
    };

    const updated = await PostModel.findOneAndUpdate(
      { type, postId },
      { stalkRef: stalkId, ...pageResult },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const stalkItem = await StalkModel.findById(stalkId);
    if (stalkItem) {
      stalkItem.postRef = updated._id;
      await stalkItem.save();
    }

    const watchedItems = postItem?.watchRef.reduce((acc: any, item: any) => {
      acc[item.watchId] = item;
      return acc;
    }, []);

    const server = await ServerModel.findOneAndUpdate(
      { serverName: "OPX" },
      { serverType: "embed", serverName: "OPX" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const postEpisodes = episodes?.[0]?.server_data.map((item: any) => ({
      watchId: item?.slug,
      watchLink: pageResult.postLink,
      watchName: item?.name,
      watchServer: {
        serverRef: server._id,
        serverM3u8: item?.link_m3u8,
        serverPlayer: item?.link_embed,
      },
    }));

    await Promise.all(
      postEpisodes
        .filter((item: any) => !watchedItems?.[item.watchId])
        .map((item: any) =>
          WatchModel.create({
            type,
            postRef: updated._id,
            ...item,
          }).then((created) => updated.watchRef.push(created._id))
        )
    );

    updated.isUpdate = true;
    await updated.save();
  }
}
