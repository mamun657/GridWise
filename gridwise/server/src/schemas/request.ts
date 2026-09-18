import { z } from "zod";

const finiteNumber = z
  .number()
  .refine((v) => Number.isFinite(v), {
    message: "must be a finite number",
  });

const nonNegFinite = finiteNumber.refine((v) => v >= 0, { message: "must be non-negative" });

const positiveFinite = finiteNumber.refine((v) => v > 0, { message: "must be positive" });

const hourlyRecordSchema = z
  .object({
    hour: z.number().int().min(0).max(23),
    demand_kwh: nonNegFinite,
    solar_kwh: nonNegFinite,
    tariff_bdt_per_kwh: nonNegFinite,
  })
  .strict();

const batteryParamsSchema = z
  .object({
    capacity_kwh: positiveFinite,
    initial_energy_kwh: nonNegFinite,
    minimum_energy_kwh: nonNegFinite,
    max_charge_kwh_per_hour: positiveFinite,
    max_discharge_kwh_per_hour: positiveFinite,
  })
  .strict()
  .refine((b) => b.minimum_energy_kwh <= b.capacity_kwh, {
    message: "minimum_energy_kwh must be <= capacity_kwh",
    path: ["minimum_energy_kwh"],
  })
  .refine(
    (b) =>
      b.initial_energy_kwh >= b.minimum_energy_kwh && b.initial_energy_kwh <= b.capacity_kwh,
    {
      message: "initial_energy_kwh must be within [minimum_energy_kwh, capacity_kwh]",
      path: ["initial_energy_kwh"],
    },
  );

export const optimizeRequestSchema = z
  .object({
    scenario_id: z.string().min(1),
    operator_notes: z.array(z.string().min(1)).max(50),
    hourly: z.array(hourlyRecordSchema).length(24),
    battery: batteryParamsSchema,
  })
  .strict()
  .superRefine((req, ctx) => {
    const hours = new Set<number>();
    for (let i = 0; i < req.hourly.length; i++) {
      const h = req.hourly[i].hour;
      if (hours.has(h)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hourly", i, "hour"],
          message: `duplicate hour ${h}`,
        });
      }
      hours.add(h);
    }
    for (let expected = 0; expected < 24; expected++) {
      if (!hours.has(expected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hourly"],
          message: `missing hour ${expected}`,
        });
      }
    }
  });

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type HourlyRecord = z.infer<typeof hourlyRecordSchema>;
export type BatteryParams = z.infer<typeof batteryParamsSchema>;
