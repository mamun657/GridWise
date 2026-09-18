import { Router } from "express";
import { getMongoState } from "../models/mongoose";
import { isGroqConfigured, isMongoConfigured } from "../config";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const groqState = isGroqConfigured() ? "configured" : "missing";
  const mongoState = isMongoConfigured() ? getMongoState() : "missing";

  res.status(200).json({
    status: "ok",
    services: {
      groq: groqState,
      mongodb: mongoState,
    },
  });
});
