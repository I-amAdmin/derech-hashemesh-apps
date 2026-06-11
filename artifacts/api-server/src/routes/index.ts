import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import quotesRouter from "./quotes";
import customersRouter from "./customers";
import pushTokensRouter from "./push-tokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(quotesRouter);
router.use(customersRouter);
router.use(pushTokensRouter);

export default router;
