import mongoose from "mongoose";

const Schema = mongoose.Schema;

const StalkSchema = new Schema(
  {
    type: { type: String, required: true },

    postRef: { type: Schema.Types.ObjectId, ref: "post", default: null },

    stalkId: { type: String, required: true },
    stalkLink: { type: String, required: true },
    stalkName: { type: String, required: true },
    stalkImage: { type: String, default: "" },
    stalkEpisodeTotal: { type: String, default: "" },
    stalkEpisodeCurrent: { type: String, default: "" },
  },
  {
    collection: "stalk",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

StalkSchema.index({ type: 1, stalkId: 1 }, { unique: true });

const StalkModel = mongoose.model("stalk", StalkSchema);
export default StalkModel;
