import { DirectiveInterpretation, DirectiveType, StructuredAdjustment } from "../schemas/directive";
import { BatteryParams, HourlyRecord } from "../schemas/request";

export type AppliedDirective = {
  note_index: number;
  directive_type: DirectiveType;
  applies: boolean;
  structured_adjustment: StructuredAdjustment;
  explanation: string;
};

export type AppliedSet = {
  applies: boolean;
  raw: StructuredAdjustment;
};

export type AppliedDirectives = {
  perNote: AppliedDirective[];
  sets: Record<DirectiveType, AppliedSet>;
  solarFactorByHour: number[];
  reserveKwhByHour: number[];
  noChargeHours: Set<number>;
  noDischargeHours: Set<number>;
  maxGridByHour: number[];
};

const build24Array = (fallback: number): number[] => new Array(24).fill(fallback);
const build24Inf = (): number[] => new Array(24).fill(Number.POSITIVE_INFINITY);
const build24EmptySet = (): Set<number> => new Set();

export const applyDirectives = (
  directives: DirectiveInterpretation[],
  battery: BatteryParams,
  _hourly: HourlyRecord[],
): AppliedDirectives => {
  const solarFactorByHour = build24Array(1);
  const reserveKwhByHour = build24Array(battery.minimum_energy_kwh);
  const noChargeHours = build24EmptySet();
  const noDischargeHours = build24EmptySet();
  const maxGridByHour = build24Inf();

  const sets: Record<DirectiveType, AppliedSet> = {
    solar_reduction: { applies: false, raw: null },
    minimum_battery_reserve: { applies: false, raw: null },
    no_charge_window: { applies: false, raw: null },
    no_discharge_window: { applies: false, raw: null },
    max_grid_window: { applies: false, raw: null },
    no_op: { applies: false, raw: null },
  };

  for (const d of directives) {
    if (!d.applies) continue;
    const adj = d.structured_adjustment;
    if (d.directive_type === "solar_reduction" && adj && "factor" in adj) {
      sets.solar_reduction = { applies: true, raw: adj };
      for (const h of adj.hours) {
        solarFactorByHour[h] = Math.min(solarFactorByHour[h], adj.factor);
      }
    } else if (d.directive_type === "minimum_battery_reserve" && adj && "reserve_kwh" in adj) {
      sets.minimum_battery_reserve = { applies: true, raw: adj };
      const reserveKwh = adj.is_percentage
        ? (adj.percentage !== undefined ? adj.percentage / 100 : 0) * battery.capacity_kwh
        : adj.reserve_kwh;
      const capReserve = Math.min(reserveKwh, battery.capacity_kwh);
      for (const h of adj.hours) {
        reserveKwhByHour[h] = Math.max(reserveKwhByHour[h], capReserve);
      }
    } else if (d.directive_type === "no_charge_window" && adj && "hours" in adj) {
      sets.no_charge_window = { applies: true, raw: adj };
      for (const h of adj.hours) noChargeHours.add(h);
    } else if (d.directive_type === "no_discharge_window" && adj && "hours" in adj) {
      sets.no_discharge_window = { applies: true, raw: adj };
      for (const h of adj.hours) noDischargeHours.add(h);
    } else if (d.directive_type === "max_grid_window" && adj && "grid_cap_kwh" in adj) {
      sets.max_grid_window = { applies: true, raw: adj };
      for (const h of adj.hours) {
        maxGridByHour[h] = Math.min(maxGridByHour[h], adj.grid_cap_kwh);
      }
    }
  }

  const perNote: AppliedDirective[] = directives.map((d) => ({
    note_index: d.note_index,
    directive_type: d.directive_type,
    applies: d.applies,
    structured_adjustment: d.structured_adjustment,
    explanation: d.explanation,
  }));

  return {
    perNote,
    sets,
    solarFactorByHour,
    reserveKwhByHour,
    noChargeHours,
    noDischargeHours,
    maxGridByHour,
  };
};
