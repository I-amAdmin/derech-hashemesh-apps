import { Router } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import quotesRouter from "./quotes";
import customersRouter from "./customers";
import pushTokensRouter from "./push-tokens";
import publicQuotesRouter from "./public-quotes";

const router = Router();

router.use(healthRouter);
router.use(publicQuotesRouter);
router.use(productsRouter);
router.use(quotesRouter);
router.use(customersRouter);
router.use(pushTokensRouter);

export default router;
