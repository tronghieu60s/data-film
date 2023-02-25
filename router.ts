import PromiseRouter from "express-promise-router";

const router = PromiseRouter();

router.use("/", () => "Hello World");

export default router;
