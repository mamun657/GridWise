import type { HourlyRecord } from "../types";

/**
 * Generate a representative 24-hour demand / solar / tariff profile
 * matching the public sample cases' expected shape.
 */
export function defaultHourlyProfile(): HourlyRecord[] {
  const out: HourlyRecord[] = [];
  for (let h = 0; h < 24; h++) {
    const demand = h < 6 ? 60 : h < 10 ? 140 : h < 17 ? 180 : h < 22 ? 220 : 90;
    const solar = h >= 7 && h <= 17 ? Math.round(160 * Math.exp(-0.5 * ((h - 12) ** 2) / 9) * 1000) / 1000 : 0;
    const tariff = h >= 18 && h <= 21 ? 18 : h >= 6 && h <= 9 ? 14 : 8;
    out.push({ hour: h, demand_kwh: demand, solar_kwh: solar, tariff_bdt_per_kwh: tariff });
  }
  return out;
}

export function defaultBattery() {
  return {
    capacity_kwh: 400,
    initial_energy_kwh: 200,
    minimum_energy_kwh: 80,
    max_charge_kwh_per_hour: 120,
    max_discharge_kwh_per_hour: 120,
  };
}
