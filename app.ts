import cors from "cors";
import "dotenv/config";
import express, { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import logger from "morgan";
import router from "./router";
import ProcessEdit from "./edit";
import ProcessAnimehay from "./services/animehay";
import ProcessOPhim from "./services/ophim";
import { ResponseError } from "./core/types";

const app: Express = express();
const { PORT = 3000, NODE_ENV, MONGODB_URI } = process.env;

/* Middleware */
app.use(cors());
app.use(helmet());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/static", express.static(process.cwd() + "/public"));

/* MongoDB */
const MONGODB_URL_LOCAL = `mongodb://127.0.0.1/mongo`;
mongoose
  .connect(MONGODB_URI || MONGODB_URL_LOCAL, {})
  .then(() => {
    console.log("✔️ Connected To Database Successfully!");
    // ProcessEdit();
    // ProcessAnimehay();
    ProcessOPhim();
  })
  .catch((err: Error) =>
    console.log(`❌ Failed To Connect To Database!\n ${err}`)
  );

/* Routers */
app.get("/api/500", () => {
  throw {};
});

app.use((req: Request, res: Response, next) => {
  const status = 404;
  const errors = new Error("Not Found");
  next({ status, errors });
});

app.use(
  (err: ResponseError, req: Request, res: Response, next: NextFunction) => {
    const { status = 500, errors = err } = err;
    const message = errors?.message || "Internal Server Error";
    return res.send({ status, message, errors });
  }
);

/* Listen Port */
app.listen(PORT, () =>
  console.log(`Server is running at http://localhost:${PORT}/`)
);
