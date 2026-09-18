import mongoose from "mongoose";
import { OptimizationRun } from "../models/optimizationRun";
import { connectMongo, getMongoState } from "../models/mongoose";
import { logger } from "../utils/logger";

export type PersistInput = {
  scenario_id: string;
  operator_notes: string[];
  directive_interpretation: unknown[];
  hourly_input: unknown[];
  battery_parameters: unknown;
  hourly_plan: unknown[];
  total_grid_kwh: number;
  total_cost_bdt: number;
  peak_grid_kwh: number;
  validation_status: "passed" | "failed";
  validation_message?: string;
  processing_time_ms: number;
};

export const persistOptimizationRun = async (input: PersistInput): Promise<void> => {
  try {
    if (getMongoState() === "disconnected") {
      await connectMongo();
    }
    if (getMongoState() !== "connected" || mongoose.connection.readyState !== 1) {
      logger.debug("Skipping MongoDB persistence", { state: getMongoState() });
      return;
    }
    await OptimizationRun.create({
      scenario_id: input.scenario_id,
      operator_notes: input.operator_notes,
      directive_interpretation: input.directive_interpretation,
      hourly_input: input.hourly_input,
      battery_parameters: input.battery_parameters,
      hourly_plan: input.hourly_plan,
      total_grid_kwh: input.total_grid_kwh,
      total_cost_bdt: input.total_cost_bdt,
      peak_grid_kwh: input.peak_grid_kwh,
      validation_status: input.validation_status,
      validation_message: input.validation_message,
      processing_time_ms: input.processing_time_ms,
      persistence_status: "persisted",
    });
    logger.debug("Optimization run persisted", { scenario_id: input.scenario_id });
  } catch (e) {
    logger.warn("MongoDB persistence failed", {
      error: e instanceof Error ? e.message : "unknown",
    });
  }
};
