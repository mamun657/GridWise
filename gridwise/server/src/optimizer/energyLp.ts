import { loadGlpk } from "./glpkClient";
import { BatteryParams, HourlyRecord } from "../schemas/request";
import { AppliedDirectives } from "../services/directiveService";
import { AppError } from "../utils/errors";

export type RawHourlyPlan = {
  hour: number;
  grid_kwh: number;
  solar_used_kwh: number;
  battery_action: "charge" | "discharge" | "idle";
  battery_kwh: number;
  battery_energy_after_kwh: number;
};

const VAR_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

const safeName = (s: string): string => {
  const cleaned = s.replace(/[^A-Za-z0-9_]/g, "_");
  return VAR_NAME_PATTERN.test(cleaned) ? cleaned : `v_${cleaned}`;
};

const GLP_FR = 1;
const GLP_LO = 2;
const GLP_UP = 3;
const GLP_DB = 4;
const GLP_FX = 5;

const buildProblem = (
  hourly: HourlyRecord[],
  battery: BatteryParams,
  directives: AppliedDirectives,
): {
  lp: import("glpk.js/dist/types.js").LP;
  nameFor: {
    power: (h: number) => string;
    solarUsed: (h: number) => string;
    grid: (h: number) => string;
    battery: (h: number) => string;
  };
} => {
  const H = 24;
  const TOL = 1e-6;

  const tariff = hourly.map((r) => r.tariff_bdt_per_kwh);
  const demand = hourly.map((r) => r.demand_kwh);
  const solarAvail = hourly.map((r) => r.solar_kwh);
  const effectiveSolar = hourly.map((r, h) => r.solar_kwh * directives.solarFactorByHour[h]);

  const power: Record<string, string> = {};
  const solarUsed: Record<string, string> = {};
  const grid: Record<string, string> = {};
  const batteryVar: Record<string, string> = {};

  for (let h = 0; h < H; h++) {
    power[h] = safeName(`p_${h}`);
    solarUsed[h] = safeName(`su_${h}`);
    grid[h] = safeName(`g_${h}`);
    batteryVar[h] = safeName(`b_${h}`);
  }

  const subjectTo: import("glpk.js/dist/types.js").LP["subjectTo"] = [];
  const bounds: import("glpk.js/dist/types.js").LP["bounds"] = [];

  for (let h = 0; h < H; h++) {
    subjectTo.push({
      name: safeName(`balance_${h}`),
      vars: [
        { name: grid[h], coef: 1 },
        { name: solarUsed[h], coef: 1 },
        { name: power[h], coef: -1 },
      ],
      bnds: { type: GLP_FX, lb: demand[h], ub: demand[h] },
    });
  }

  for (let h = 0; h < H; h++) {
    const sMax = Math.max(0, effectiveSolar[h]);
    if (solarAvail[h] <= TOL || sMax <= TOL) {
      bounds.push({ name: solarUsed[h], type: GLP_FX, lb: 0, ub: 0 });
    } else {
      bounds.push({ name: solarUsed[h], type: GLP_DB, lb: 0, ub: sMax });
    }

    const gMax = Math.max(0, directives.maxGridByHour[h]);
    bounds.push({ name: grid[h], type: GLP_DB, lb: 0, ub: gMax });
  }

  for (let h = 0; h < H; h++) {
    let lb = -battery.max_discharge_kwh_per_hour;
    let ub = battery.max_charge_kwh_per_hour;
    if (directives.noChargeHours.has(h)) ub = 0;
    if (directives.noDischargeHours.has(h)) lb = 0;
    bounds.push({ name: power[h], type: GLP_DB, lb, ub });
  }

  for (let h = 0; h < H; h++) {
    const reserve = directives.reserveKwhByHour[h];
    const minKwh = Math.max(battery.minimum_energy_kwh, reserve);
    bounds.push({
      name: batteryVar[h],
      type: GLP_DB,
      lb: Math.max(0, minKwh),
      ub: battery.capacity_kwh,
    });
    if (reserve > TOL) {
      subjectTo.push({
        name: safeName(`breserve_${h}`),
        vars: [{ name: batteryVar[h], coef: 1 }],
        bnds: { type: GLP_LO, lb: reserve, ub: 0 },
      });
    }
  }

  const btransRows: { name: string; consts: Record<string, number>; vars: { name: string; coef: number }[] }[] = [];

  for (let h = 0; h < H; h++) {
    const rowVars: { name: string; coef: number }[] = [];
    if (h === 0) {
      rowVars.push({ name: batteryVar[h], coef: 1 });
      rowVars.push({ name: power[h], coef: -1 });
      btransRows.push({
        name: safeName(`btrans_${h}`),
        consts: { initial: battery.initial_energy_kwh },
        vars: rowVars,
      });
    } else {
      rowVars.push({ name: batteryVar[h], coef: 1 });
      rowVars.push({ name: power[h], coef: -1 });
      rowVars.push({ name: batteryVar[h - 1], coef: -1 });
      btransRows.push({ name: safeName(`btrans_${h}`), consts: {}, vars: rowVars });
    }
  }

  for (const row of btransRows) {
    const constSum = Object.values(row.consts).reduce((a, b) => a + b, 0);
    subjectTo.push({
      name: row.name,
      vars: row.vars,
      bnds: { type: GLP_FX, lb: constSum, ub: constSum },
    });
  }

  subjectTo.push({
    name: safeName(`b_neutral`),
    vars: [{ name: batteryVar[H - 1], coef: 1 }],
    bnds: {
      type: GLP_FX,
      lb: battery.initial_energy_kwh,
      ub: battery.initial_energy_kwh,
    },
  });

  const objectiveVars = hourly.map((_, h) => ({ name: grid[h], coef: tariff[h] }));

  const lp: import("glpk.js/dist/types.js").LP = {
    name: "gridwise",
    objective: { direction: 1, name: "cost", vars: objectiveVars },
    subjectTo,
    bounds,
    options: { msglev: 0, presol: true },
  };

  return {
    lp,
    nameFor: {
      power: (h: number) => power[h],
      solarUsed: (h: number) => solarUsed[h],
      grid: (h: number) => grid[h],
      battery: (h: number) => batteryVar[h],
    },
  };
};

export const optimizeEnergy = async (
  hourly: HourlyRecord[],
  battery: BatteryParams,
  directives: AppliedDirectives,
): Promise<RawHourlyPlan[]> => {
  const glpk = await loadGlpk();
  const { lp, nameFor } = buildProblem(hourly, battery, directives);

  let result;
  try {
    result = glpk.solve(lp, { msglev: 0, presol: true });
  } catch (e) {
    throw new AppError(
      "OPTIMIZATION_FAILED",
      e instanceof Error ? e.message : "GLPK solver error",
      500,
    );
  }

  const status = result?.result?.status;
  if (status !== 5) {
    throw new AppError(
      "OPTIMIZATION_FAILED",
      `Optimization infeasible or no solution (status=${status})`,
      422,
    );
  }

  const vars = result.result.vars;
  const H = 24;
  const TOL = 1e-3;

  const plan: RawHourlyPlan[] = [];
  for (let h = 0; h < H; h++) {
    const gridV = Number(vars[nameFor.grid(h)] ?? 0);
    const solarUsedV = Number(vars[nameFor.solarUsed(h)] ?? 0);
    const powerV = Number(vars[nameFor.power(h)] ?? 0);
    const batteryV = Number(vars[nameFor.battery(h)] ?? 0);

    const gridKwh = Math.max(0, gridV);
    const solarUsedKwh = Math.max(0, solarUsedV);

    let action: "charge" | "discharge" | "idle" = "idle";
    let batteryKwh = 0;
    if (powerV > TOL) {
      action = "charge";
      batteryKwh = powerV;
    } else if (powerV < -TOL) {
      action = "discharge";
      batteryKwh = -powerV;
    }

    plan.push({
      hour: h,
      grid_kwh: gridKwh,
      solar_used_kwh: solarUsedKwh,
      battery_action: action,
      battery_kwh: batteryKwh,
      battery_energy_after_kwh: batteryV,
    });
  }

  return plan;
};
