import { z } from "zod";

export const DIRECTIVE_TYPES = [
  "solar_reduction",
  "minimum_battery_reserve",
  "no_charge_window",
  "no_discharge_window",
  "max_grid_window",
  "no_op",
] as const;

export type DirectiveType = (typeof DIRECTIVE_TYPES)[number];

const hoursArraySchema = z
  .array(z.number().int().min(0).max(23))
  .min(1)
  .max(24);

const ascendingUnique = (arr: number[]): boolean => {
  if (arr.length !== new Set(arr).size) return false;
  for (let i = 1; i < arr.length; i++) if (arr[i] <= arr[i - 1]) return false;
  return true;
};

const refineHours = (data: { hours: number[] }, ctx: z.RefinementCtx) => {
  if (!ascendingUnique(data.hours)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "hours must be ascending and unique",
      path: ["hours"],
    });
  }
};

const solarReductionSchema = z
  .object({
    hours: hoursArraySchema,
    factor: z.number().min(0).max(1),
  })
  .strict()
  .superRefine(refineHours);

const minimumBatteryReserveSchema = z
  .object({
    hours: hoursArraySchema,
    reserve_kwh: z.number().min(0),
    is_percentage: z.boolean().optional().default(false),
    percentage: z.number().min(0).max(100).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!ascendingUnique(data.hours)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hours must be ascending and unique",
        path: ["hours"],
      });
    }
    if (data.is_percentage && data.percentage === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percentage required when is_percentage is true",
        path: ["percentage"],
      });
    }
  });

const windowHoursSchema = z
  .object({
    hours: hoursArraySchema,
  })
  .strict()
  .superRefine(refineHours);

const maxGridWindowSchema = z
  .object({
    hours: hoursArraySchema,
    grid_cap_kwh: z.number().min(0),
  })
  .strict()
  .superRefine(refineHours);

export const structuredAdjustmentSchema = z.union([
  solarReductionSchema,
  minimumBatteryReserveSchema,
  windowHoursSchema,
  maxGridWindowSchema,
  z.null(),
]);

export const directiveInterpretationSchema = z
  .object({
    note_index: z.number().int().nonnegative(),
    applies: z.boolean(),
    directive_type: z.enum(DIRECTIVE_TYPES),
    structured_adjustment: structuredAdjustmentSchema.nullable(),
    explanation: z.string(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.directive_type === "no_op") {
      if (data.structured_adjustment !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["structured_adjustment"],
          message: "no_op must have null structured_adjustment",
        });
      }
      if (data.applies !== false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["applies"],
          message: "no_op must have applies=false",
        });
      }
      return;
    }

    if (data.structured_adjustment === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["structured_adjustment"],
        message: `directive ${data.directive_type} requires structured_adjustment`,
      });
    }
  });

export type StructuredAdjustment =
  | { hours: number[]; factor: number }
  | { hours: number[]; reserve_kwh: number; is_percentage?: boolean; percentage?: number }
  | { hours: number[] }
  | { hours: number[]; grid_cap_kwh: number }
  | null;

export type DirectiveInterpretation = {
  note_index: number;
  applies: boolean;
  directive_type: DirectiveType;
  structured_adjustment: StructuredAdjustment;
  explanation: string;
};

export const directiveListSchema = z.array(directiveInterpretationSchema);

export const validateDirectiveByType = (
  directive_type: DirectiveType,
  structured_adjustment: StructuredAdjustment,
): { ok: true } | { ok: false; reason: string } => {
  if (directive_type === "no_op") {
    if (structured_adjustment !== null) {
      return { ok: false, reason: "no_op must have null structured_adjustment" };
    }
    return { ok: true };
  }
  if (structured_adjustment === null) {
    return { ok: false, reason: `directive ${directive_type} requires structured_adjustment` };
  }
  if (directive_type === "solar_reduction") {
    const r = solarReductionSchema.safeParse(structured_adjustment);
    if (!r.success) return { ok: false, reason: r.error.issues[0]?.message ?? "invalid" };
    return { ok: true };
  }
  if (directive_type === "minimum_battery_reserve") {
    const r = minimumBatteryReserveSchema.safeParse(structured_adjustment);
    if (!r.success) return { ok: false, reason: r.error.issues[0]?.message ?? "invalid" };
    return { ok: true };
  }
  if (directive_type === "no_charge_window" || directive_type === "no_discharge_window") {
    const r = windowHoursSchema.safeParse(structured_adjustment);
    if (!r.success) return { ok: false, reason: r.error.issues[0]?.message ?? "invalid" };
    return { ok: true };
  }
  if (directive_type === "max_grid_window") {
    const r = maxGridWindowSchema.safeParse(structured_adjustment);
    if (!r.success) return { ok: false, reason: r.error.issues[0]?.message ?? "invalid" };
    return { ok: true };
  }
  return { ok: false, reason: "unknown directive_type" };
};

export const directiveTypeAdjustmentHint = (type: DirectiveType): string => {
  switch (type) {
    case "solar_reduction":
      return "{ hours: [int], factor: number in [0,1] — remaining usable fraction }";
    case "minimum_battery_reserve":
      return "{ hours: [int], reserve_kwh: number, is_percentage?: boolean, percentage?: number in [0,100] }";
    case "no_charge_window":
      return "{ hours: [int] }";
    case "no_discharge_window":
      return "{ hours: [int] }";
    case "max_grid_window":
      return "{ hours: [int], grid_cap_kwh: number }";
    case "no_op":
      return "null";
  }
};
