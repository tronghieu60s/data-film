import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    type: { type: String, required: true },
    isUpdate: { type: Boolean, default: true },

    stalkRef: { type: Schema.Types.ObjectId, ref: "stalk", required: true },
    groupRef: { type: Schema.Types.ObjectId, ref: "group", default: null },
    watchRef: { type: [Schema.Types.ObjectId], ref: "watch", default: [] },

    postId: { type: String, required: true },
    postLink: { type: String, required: true },
    postName: { type: String, required: true },
    postType: { type: String, enum: ["single", "series"], default: "single" },
    postImage: { type: String, default: "" },
    postPoster: { type: String, default: "" },
    postOriginalName: { type: String, default: "" },
    postCategories: { type: String, default: "" },
    postTags: { type: String, default: "" },
    postCountry: { type: String, default: "" },
    postActors: { type: String, default: "" },
    postDirectors: { type: String, default: "" },
    postStatus: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "completed",
    },
    postPublish: { type: String, default: "" },
    postQuality: { type: String, default: "" },
    postDuration: { type: String, default: "" },
    postDescription: { type: String, default: "" },
    postTrailer: { type: String, default: "" },
    postEpisodeTotal: { type: String, default: "" },
    postEpisodeCurrent: { type: String, default: "" },
  },
  {
    collection: "post",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

PostSchema.index({ type: 1, postId: 1 }, { unique: true });

const PostModel = mongoose.model("post", PostSchema);
export default PostModel;
