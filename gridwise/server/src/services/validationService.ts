import { RawHourlyPlan } from "../optimizer/energyLp";
import { BatteryParams, HourlyRecord } from "../schemas/request";
import { AppliedDirectives } from "./directiveService";
import { AppError } from "../utils/errors";

export type PlanTotals = {
  total_grid_kwh: number;
  total_cost_bdt: number;
  peak_grid_kwh: number;
};

const TOL = 1e-2;

export const validateHourlyPlan = (
  plan: RawHourlyPlan[],
  hourly: HourlyRecord[],
  battery: BatteryParams,
  directives: AppliedDirectives,
): { ok: true; totals: PlanTotals } | { ok: false; reason: string } => {
  if (plan.length !== 24) {
    return { ok: false, reason: `plan must have 24 entries (got ${plan.length})` };
  }

  const recByHour = new Map<number, HourlyRecord>();
  for (const r of hourly) recByHour.set(r.hour, r);

  let totalGrid = 0;
  let totalCost = 0;
  let peakGrid = 0;
  let lastBattery = battery.initial_energy_kwh;

  for (let i = 0; i < 24; i++) {
    const p = plan[i];
    const rec = recByHour.get(p.hour);
    if (!rec) return { ok: false, reason: `missing hourly record for hour ${p.hour}` };
    if (p.grid_kwh < -TOL) return { ok: false, reason: `grid_kwh negative at hour ${p.hour}` };
    if (p.solar_used_kwh < -TOL) return { ok: false, reason: `solar_used_kwh negative at hour ${p.hour}` };
    if (p.battery_kwh < -TOL) return { ok: false, reason: `battery_kwh negative at hour ${p.hour}` };
    if (!["charge", "discharge", "idle"].includes(p.battery_action)) {
      return { ok: false, reason: `invalid battery_action at hour ${p.hour}` };
    }

    const effSolar = rec.solar_kwh * directives.solarFactorByHour[p.hour];
    if (p.solar_used_kwh > effSolar + TOL) {
      return {
        ok: false,
        reason: `solar_used_kwh ${p.solar_used_kwh} exceeds effective solar ${effSolar} at hour ${p.hour}`,
      };
    }

    if (p.battery_energy_after_kwh < battery.minimum_energy_kwh - TOL) {
      return {
        ok: false,
        reason: `battery below min at hour ${p.hour}: ${p.battery_energy_after_kwh} < ${battery.minimum_energy_kwh}`,
      };
    }
    if (p.battery_energy_after_kwh > battery.capacity_kwh + TOL) {
      return {
        ok: false,
        reason: `battery above capacity at hour ${p.hour}: ${p.battery_energy_after_kwh}`,
      };
    }

    let chargeKwh = 0;
    let dischargeKwh = 0;
    if (p.battery_action === "charge") chargeKwh = p.battery_kwh;
    else if (p.battery_action === "discharge") dischargeKwh = p.battery_kwh;

    if (chargeKwh > battery.max_charge_kwh_per_hour + TOL) {
      return {
        ok: false,
        reason: `charge above limit at hour ${p.hour}: ${chargeKwh} > ${battery.max_charge_kwh_per_hour}`,
      };
    }
    if (dischargeKwh > battery.max_discharge_kwh_per_hour + TOL) {
      return {
        ok: false,
        reason: `discharge above limit at hour ${p.hour}: ${dischargeKwh} > ${battery.max_discharge_kwh_per_hour}`,
      };
    }

    const expectedAfter = lastBattery + chargeKwh - dischargeKwh;
    if (Math.abs(expectedAfter - p.battery_energy_after_kwh) > 1e-2) {
      return {
        ok: false,
        reason: `battery transition inconsistent at hour ${p.hour}: expected ${expectedAfter} got ${p.battery_energy_after_kwh}`,
      };
    }

    if (directives.noChargeHours.has(p.hour) && chargeKwh > TOL) {
      return { ok: false, reason: `charge not allowed in no_charge_window hour ${p.hour}` };
    }
    if (directives.noDischargeHours.has(p.hour) && dischargeKwh > TOL) {
      return { ok: false, reason: `discharge not allowed in no_discharge_window hour ${p.hour}` };
    }

    const reserve = directives.reserveKwhByHour[p.hour];
    if (p.battery_energy_after_kwh < reserve - TOL) {
      return {
        ok: false,
        reason: `battery below reserve ${reserve} at hour ${p.hour}: ${p.battery_energy_after_kwh}`,
      };
    }

    const balanceLhs = p.grid_kwh + p.solar_used_kwh + dischargeKwh;
    const balanceRhs = rec.demand_kwh + chargeKwh;
    if (Math.abs(balanceLhs - balanceRhs) > 1e-2) {
      return {
        ok: false,
        reason: `energy balance violated at hour ${p.hour}: LHS ${balanceLhs} != RHS ${balanceRhs}`,
      };
    }

    if (p.grid_kwh > directives.maxGridByHour[p.hour] + TOL) {
      return {
        ok: false,
        reason: `grid cap exceeded at hour ${p.hour}: ${p.grid_kwh} > ${directives.maxGridByHour[p.hour]}`,
      };
    }

    const actionConsistent =
      (p.battery_action === "idle" && p.battery_kwh < TOL) ||
      (p.battery_action === "charge" && p.battery_kwh > 0 && chargeKwh > 0 && dischargeKwh === 0) ||
      (p.battery_action === "discharge" && p.battery_kwh > 0 && dischargeKwh > 0 && chargeKwh === 0);
    if (!actionConsistent) {
      return { ok: false, reason: `battery_action inconsistent at hour ${p.hour}` };
    }

    totalGrid += p.grid_kwh;
    totalCost += p.grid_kwh * rec.tariff_bdt_per_kwh;
    if (p.grid_kwh > peakGrid) peakGrid = p.grid_kwh;
    lastBattery = p.battery_energy_after_kwh;
  }

  if (Math.abs(lastBattery - battery.initial_energy_kwh) > 1e-2) {
    return {
      ok: false,
      reason: `battery neutrality violated: final ${lastBattery} vs initial ${battery.initial_energy_kwh}`,
    };
  }

  return {
    ok: true,
    totals: {
      total_grid_kwh: round(totalGrid, 4),
      total_cost_bdt: round(totalCost, 4),
      peak_grid_kwh: round(peakGrid, 4),
    },
  };
};

const round = (v: number, digits: number): number => {
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
};

export const ensurePlanValid = (
  plan: RawHourlyPlan[],
  hourly: HourlyRecord[],
  battery: BatteryParams,
  directives: AppliedDirectives,
): PlanTotals => {
  const r = validateHourlyPlan(plan, hourly, battery, directives);
  if (r.ok === false) {
    throw new AppError("PLAN_VALIDATION_FAILED", r.reason, 422);
  }
  return r.totals;
};
