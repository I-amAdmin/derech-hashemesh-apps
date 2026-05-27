import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import quotesRouter from "./quotes";
import customersRouter from "./customers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(quotesRouter);
router.use(customersRouter);

export default router;
