export type DirectiveType =
  | "solar_reduction"
  | "minimum_battery_reserve"
  | "no_charge_window"
  | "no_discharge_window"
  | "max_grid_window"
  | "no_op";

export interface StructuredAdjustment {
  hours?: number[];
  factor?: number;
  reserve_kwh?: number;
  is_percentage?: boolean;
  percentage?: number;
  grid_cap_kwh?: number;
}

export interface DirectiveInterpretation {
  note_index: number;
  applies: boolean;
  directive_type: DirectiveType;
  structured_adjustment: StructuredAdjustment | null;
  explanation: string;
}

export type BatteryAction = "charge" | "discharge" | "idle";

export interface HourlyPlan {
  hour: number;
  grid_kwh: number;
  solar_used_kwh: number;
  battery_action: BatteryAction;
  battery_kwh: number;
  battery_energy_after_kwh: number;
}

export interface HourlyRecord {
  hour: number;
  demand_kwh: number;
  solar_kwh: number;
  tariff_bdt_per_kwh: number;
}

export interface BatteryParams {
  capacity_kwh: number;
  initial_energy_kwh: number;
  minimum_energy_kwh: number;
  max_charge_kwh_per_hour: number;
  max_discharge_kwh_per_hour: number;
}

export interface OptimizeResponse {
  scenario_id: string;
  directive_interpretation: DirectiveInterpretation[];
  hourly_plan: HourlyPlan[];
  total_grid_kwh: number;
  total_cost_bdt: number;
  peak_grid_kwh: number;
  plan_summary: string;
  validation_status: "passed" | "failed";
}

export interface SampleCase {
  scenario_id: string;
  description: string;
  operator_notes: string[];
  battery: BatteryParams;
}

export interface SampleCasesResponse {
  cases: SampleCase[];
  hourly: HourlyRecord[];
}

export interface HealthResponse {
  status: string;
  services?: { groq?: string; mongodb?: string };
}
