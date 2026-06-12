import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import quotesRouter from "./quotes";
import customersRouter from "./customers";
import pushTokensRouter from "./push-tokens";
import publicQuotesRouter from "./public-quotes";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicQuotesRouter);
router.use(requireAuth);
router.use(productsRouter);
router.use(quotesRouter);
router.use(customersRouter);
router.use(pushTokensRouter);

export default router;
