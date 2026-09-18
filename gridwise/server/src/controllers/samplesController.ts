import { Request, Response } from "express";
import { loadSampleCases, loadHourlyProfile } from "../utils/sampleCases";
import { buildErrorBody } from "../utils/errors";

export const getSampleCases = (_req: Request, res: Response): void => {
  try {
    const cases = loadSampleCases();
    const hourly = loadHourlyProfile();
    res.status(200).json({ cases, hourly });
  } catch (e) {
    res.status(500).json(
      buildErrorBody("INTERNAL_ERROR", e instanceof Error ? e.message : "load failed"),
    );
  }
};
