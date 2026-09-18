import { Router } from "express";
import { getSampleCases } from "../controllers/samplesController";

export const samplesRouter = Router();

samplesRouter.get("/", getSampleCases);
