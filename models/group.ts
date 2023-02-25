import mongoose from "mongoose";

const Schema = mongoose.Schema;

const GroupSchema = new Schema(
  {
    groupName: { type: String, default: "" },
    groupItems: {
      type: [
        new Schema({
          postRef: { type: Schema.Types.ObjectId, ref: "post", default: null },
          postId: { type: String, default: "" },
          postName: { type: String, default: "" },
        }),
      ],
      default: [],
    },
  },
  {
    collection: "group",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

const GroupModel = mongoose.model("group", GroupSchema);
export default GroupModel;
