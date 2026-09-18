import mongoose, { Schema, Document } from "mongoose";

export interface OptimizationRunDocument extends Document {
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
  persistence_status: "persisted" | "skipped" | "failed";
  created_at: Date;
}

const optimizationRunSchema = new Schema<OptimizationRunDocument>(
  {
    scenario_id: { type: String, required: true, index: true },
    operator_notes: { type: [String], required: true },
    directive_interpretation: { type: [Schema.Types.Mixed], required: true },
    hourly_input: { type: [Schema.Types.Mixed], required: true },
    battery_parameters: { type: Schema.Types.Mixed, required: true },
    hourly_plan: { type: [Schema.Types.Mixed], required: true },
    total_grid_kwh: { type: Number, required: true },
    total_cost_bdt: { type: Number, required: true },
    peak_grid_kwh: { type: Number, required: true },
    validation_status: { type: String, enum: ["passed", "failed"], required: true },
    validation_message: { type: String },
    processing_time_ms: { type: Number, required: true },
    persistence_status: { type: String, enum: ["persisted", "skipped", "failed"], required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

export const OptimizationRun = mongoose.model<OptimizationRunDocument>(
  "OptimizationRun",
  optimizationRunSchema,
);
