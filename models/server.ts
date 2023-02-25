import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ServerSchema = new Schema(
  {
    serverName: { type: String, required: true },
    serverPrefix: { type: String, default: "" },
    serverType: { type: String, enum: ["link", "embed"], default: "link" },
  },
  {
    collection: "server",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

const ServerModel = mongoose.model("server", ServerSchema);
export default ServerModel;
