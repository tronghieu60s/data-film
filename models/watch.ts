import mongoose from "mongoose";

const Schema = mongoose.Schema;

const WatchSchema = new Schema(
  {
    isUpdate: { type: Boolean, default: true },

    postRef: { type: Schema.Types.ObjectId, ref: "post", required: true },

    watchId: { type: String, required: true },
    watchLink: { type: String, default: "" },
    watchName: { type: String, required: true },
    watchServer: {
      type: [new Schema({
        serverRef: {
          type: Schema.Types.ObjectId,
          ref: "server",
          required: true,
        },
        serverPlayer: { type: String, default: "" },
      })],
      default: [],
    },
  },
  {
    collection: "watch",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

const WatchModel = mongoose.model("watch", WatchSchema);
export default WatchModel;
