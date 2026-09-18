import { Router } from "express";
import { postOptimize } from "../controllers/optimizeController";

export const optimizeRouter = Router();

optimizeRouter.post("/", postOptimize);
