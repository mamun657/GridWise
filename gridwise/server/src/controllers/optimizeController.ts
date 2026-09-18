import { Request, Response } from "express";
import { optimizeRequestSchema } from "../schemas/request";
import { AppError, buildErrorBody } from "../utils/errors";
import { logger } from "../utils/logger";
import { interpretDirectives } from "../services/groqInterpreter";
import { applyDirectives } from "../services/directiveService";
import { optimizeEnergy } from "../optimizer/energyLp";
import { ensurePlanValid } from "../services/validationService";
import { persistOptimizationRun } from "./persistenceController";

const formatValidationError = (issues: unknown[]): unknown[] =>
  issues.map((i) => {
    const issue = i as { path?: (string | number)[]; message?: string; code?: string };
    return {
      path: issue.path?.join(".") ?? "",
      message: issue.message ?? "invalid",
      code: issue.code ?? "invalid",
    };
  });

export const postOptimize = async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const parsed = optimizeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const err = new AppError(
      "INVALID_REQUEST",
      "Request validation failed",
      400,
      formatValidationError(parsed.error.issues),
    );
    res.status(err.status).json(buildErrorBody(err.code, err.message, err.details));
    return;
  }
  const request = parsed.data;

  try {
    const directives = await interpretDirectives(request.operator_notes);
    const applied = applyDirectives(directives, request.battery, request.hourly);

    const rawPlan = await optimizeEnergy(request.hourly, request.battery, applied);

    const totals = ensurePlanValid(rawPlan, request.hourly, request.battery, applied);

    const hourly_plan = rawPlan.map((p) => ({
      hour: p.hour,
      grid_kwh: round(p.grid_kwh, 4),
      solar_used_kwh: round(p.solar_used_kwh, 4),
      battery_action: p.battery_action,
      battery_kwh: round(p.battery_kwh, 4),
      battery_energy_after_kwh: round(p.battery_energy_after_kwh, 4),
    }));

    const directive_interpretation = directives.map((d) => ({
      note_index: d.note_index,
      applies: d.applies,
      directive_type: d.directive_type,
      structured_adjustment: d.structured_adjustment,
      explanation: d.explanation,
    }));

    const summary = buildPlanSummary(hourly_plan, totals, applied);

    const responseBody = {
      scenario_id: request.scenario_id,
      directive_interpretation,
      hourly_plan,
      total_grid_kwh: totals.total_grid_kwh,
      total_cost_bdt: totals.total_cost_bdt,
      peak_grid_kwh: totals.peak_grid_kwh,
      plan_summary: summary,
      validation_status: "passed",
    };

    const processing_time_ms = Date.now() - start;

    void persistOptimizationRun({
      scenario_id: request.scenario_id,
      operator_notes: request.operator_notes,
      directive_interpretation,
      hourly_input: request.hourly,
      battery_parameters: request.battery,
      hourly_plan,
      total_grid_kwh: totals.total_grid_kwh,
      total_cost_bdt: totals.total_cost_bdt,
      peak_grid_kwh: totals.peak_grid_kwh,
      validation_status: "passed",
      processing_time_ms,
    });

    res.status(200).json(responseBody);
  } catch (e) {
    const processing_time_ms = Date.now() - start;
    if (e instanceof AppError) {
      logger.warn("Optimize request failed", {
        code: e.code,
        message: e.message,
        processing_time_ms,
      });
      if (e.code === "INVALID_REQUEST") {
        res.status(e.status).json(buildErrorBody(e.code, e.message, e.details));
        return;
      }
      void persistOptimizationRun({
        scenario_id: request.scenario_id,
        operator_notes: request.operator_notes,
        directive_interpretation: [],
        hourly_input: request.hourly,
        battery_parameters: request.battery,
        hourly_plan: [],
        total_grid_kwh: 0,
        total_cost_bdt: 0,
        peak_grid_kwh: 0,
        validation_status: "failed",
        validation_message: e.message,
        processing_time_ms,
      });
      res.status(e.status).json(buildErrorBody(e.code, e.message));
      return;
    }
    logger.error("Optimize unexpected error", {
      error: e instanceof Error ? e.message : "unknown",
      processing_time_ms,
    });
    res.status(500).json(buildErrorBody("INTERNAL_ERROR", "Unexpected server error"));
  }
};

const round = (v: number, digits: number): number => {
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
};

const buildPlanSummary = (
  plan: Array<{
    hour: number;
    grid_kwh: number;
    solar_used_kwh: number;
    battery_action: string;
    battery_kwh: number;
    battery_energy_after_kwh: number;
  }>,
  totals: { total_grid_kwh: number; total_cost_bdt: number; peak_grid_kwh: number },
  applied: { sets: Record<string, { applies: boolean }> },
): string => {
  const peakHour = plan.reduce((acc, p) => (p.grid_kwh > plan[acc].grid_kwh ? p.hour : acc), 0);
  const totalSolar = plan.reduce((s, p) => s + p.solar_used_kwh, 0);
  const activeDirectives = Object.entries(applied.sets)
    .filter(([, v]) => v.applies)
    .map(([k]) => k)
    .join(", ");
  return [
    `24-hour plan optimized. Total grid ${totals.total_grid_kwh.toFixed(2)} kWh,`,
    `peak grid ${totals.peak_grid_kwh.toFixed(2)} kWh at hour ${peakHour},`,
    `total cost ${totals.total_cost_bdt.toFixed(2)} BDT, solar utilized ${totalSolar.toFixed(2)} kWh.`,
    activeDirectives ? `Applied directives: ${activeDirectives}.` : "No operational directives applied.",
  ].join(" ");
};
