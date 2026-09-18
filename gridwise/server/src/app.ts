import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { healthRouter } from "./routes/health";
import { optimizeRouter } from "./routes/optimize";
import { samplesRouter } from "./routes/samples";
import { buildErrorBody } from "./utils/errors";
import { config } from "./config";

const HOURLY_EXAMPLE = [
  { hour: 0,  demand_kwh: 60,  solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
  { hour: 1,  demand_kwh: 60,  solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
  { hour: 2,  demand_kwh: 60,  solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
  { hour: 3,  demand_kwh: 60,  solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
  { hour: 4,  demand_kwh: 60,  solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
  { hour: 5,  demand_kwh: 80,  solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
  { hour: 6,  demand_kwh: 100, solar_kwh: 40,  tariff_bdt_per_kwh: 8.5 },
  { hour: 7,  demand_kwh: 120, solar_kwh: 68,  tariff_bdt_per_kwh: 8.5 },
  { hour: 8,  demand_kwh: 180, solar_kwh: 96,  tariff_bdt_per_kwh: 8.5 },
  { hour: 9,  demand_kwh: 192, solar_kwh: 124, tariff_bdt_per_kwh: 8.5 },
  { hour: 10, demand_kwh: 204, solar_kwh: 152, tariff_bdt_per_kwh: 8.5 },
  { hour: 11, demand_kwh: 216, solar_kwh: 180, tariff_bdt_per_kwh: 8.5 },
  { hour: 12, demand_kwh: 228, solar_kwh: 180, tariff_bdt_per_kwh: 8.5 },
  { hour: 13, demand_kwh: 250, solar_kwh: 180, tariff_bdt_per_kwh: 8.5 },
  { hour: 14, demand_kwh: 240, solar_kwh: 152, tariff_bdt_per_kwh: 8.5 },
  { hour: 15, demand_kwh: 230, solar_kwh: 124, tariff_bdt_per_kwh: 8.5 },
  { hour: 16, demand_kwh: 220, solar_kwh: 96,  tariff_bdt_per_kwh: 8.5 },
  { hour: 17, demand_kwh: 300, solar_kwh: 68,  tariff_bdt_per_kwh: 8.5 },
  { hour: 18, demand_kwh: 275, solar_kwh: 40,  tariff_bdt_per_kwh: 12  },
  { hour: 19, demand_kwh: 250, solar_kwh: 0,   tariff_bdt_per_kwh: 12  },
  { hour: 20, demand_kwh: 225, solar_kwh: 0,   tariff_bdt_per_kwh: 12  },
  { hour: 21, demand_kwh: 200, solar_kwh: 0,   tariff_bdt_per_kwh: 12  },
  { hour: 22, demand_kwh: 100, solar_kwh: 0,   tariff_bdt_per_kwh: 12  },
  { hour: 23, demand_kwh: 100, solar_kwh: 0,   tariff_bdt_per_kwh: 6   },
];

const HOURLY_PLAN_EXAMPLE = [
  { hour: 0,  grid_kwh: 30,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 30,  battery_energy_after_kwh: 200 },
  { hour: 1,  grid_kwh: 30,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 30,  battery_energy_after_kwh: 200 },
  { hour: 2,  grid_kwh: 30,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 30,  battery_energy_after_kwh: 200 },
  { hour: 3,  grid_kwh: 30,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 30,  battery_energy_after_kwh: 200 },
  { hour: 4,  grid_kwh: 30,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 30,  battery_energy_after_kwh: 200 },
  { hour: 5,  grid_kwh: 50,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 30,  battery_energy_after_kwh: 200 },
  { hour: 6,  grid_kwh: 60,   solar_used_kwh: 40,  battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 7,  grid_kwh: 52,   solar_used_kwh: 68,  battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 8,  grid_kwh: 84,   solar_used_kwh: 96,  battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 9,  grid_kwh: 68,   solar_used_kwh: 124, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 10, grid_kwh: 52,   solar_used_kwh: 152, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 11, grid_kwh: 36,   solar_used_kwh: 180, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 12, grid_kwh: 48,   solar_used_kwh: 180, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 13, grid_kwh: 70,   solar_used_kwh: 180, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 14, grid_kwh: 88,   solar_used_kwh: 152, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 15, grid_kwh: 106,  solar_used_kwh: 124, battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 16, grid_kwh: 124,  solar_used_kwh: 96,  battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 200 },
  { hour: 17, grid_kwh: 132,  solar_used_kwh: 68,  battery_action: "discharge", battery_kwh: 100, battery_energy_after_kwh: 100 },
  { hour: 18, grid_kwh: 235,  solar_used_kwh: 40,  battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 100 },
  { hour: 19, grid_kwh: 250,  solar_used_kwh: 0,   battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 100 },
  { hour: 20, grid_kwh: 225,  solar_used_kwh: 0,   battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 100 },
  { hour: 21, grid_kwh: 200,  solar_used_kwh: 0,   battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 100 },
  { hour: 22, grid_kwh: 100,  solar_used_kwh: 0,   battery_action: "idle",      battery_kwh: 0,   battery_energy_after_kwh: 100 },
  { hour: 23, grid_kwh: 50,   solar_used_kwh: 0,   battery_action: "charge",    battery_kwh: 50,  battery_energy_after_kwh: 150 },
];

const DIRECTIVE_INTERPRETATION_EXAMPLE = [
  {
    note_index: 0,
    applies: true,
    directive_type: "solar_reduction",
    structured_adjustment: { hours: [13, 14], factor: 0.2 },
    explanation: "Solar output will be reduced to 20% of forecast between hours 13 and 14.",
  },
  {
    note_index: 1,
    applies: true,
    directive_type: "minimum_battery_reserve",
    structured_adjustment: { hours: [18, 19, 20, 21], reserve_kwh: 120 },
    explanation: "Reserve at least 120 kWh in the battery from 18:00 to 21:00.",
  },
];

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GridWise API",
      version: "1.0.0",
      description:
        "Smart Campus Energy Optimization / LLM-Assisted Operator Directive Interpretation",
    },
    servers: [{ url: `http://localhost:${config.port}`, description: "Local GridWise backend" }],
    tags: [
      { name: "System", description: "API health and service state" },
      { name: "Optimization", description: "Optimize campus energy dispatch" },
      { name: "Samples", description: "Public demo scenarios" },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Get API health and service states",
          tags: ["System"],
          responses: {
            "200": {
              description: "GridWise API up and service connectivity snapshot",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                  example: {
                    status: "ok",
                    services: { groq: "configured", mongodb: "connected" },
                  },
                },
              },
            },
          },
        },
      },
      "/optimize-energy": {
        post: {
          summary: "Run the GridWise optimization engine",
          description:
            "Interprets operator notes with Groq, applies directives, solves the 24-hour dispatch (LP via glpk.js), and validates the result.",
          tags: ["Optimization"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OptimizeRequest" },
                example: {
                  scenario_id: "GW-PUB-001-solar-evening-reserve",
                  operator_notes: [
                    "Solar output will drop to about 20% from 1 PM to 3 PM.",
                    "Keep at least 120 kWh from 6 PM to 9 PM.",
                  ],
                  hourly: HOURLY_EXAMPLE,
                  battery: {
                    capacity_kwh: 400,
                    initial_energy_kwh: 200,
                    minimum_energy_kwh: 80,
                    max_charge_kwh_per_hour: 120,
                    max_discharge_kwh_per_hour: 120,
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Optimization completed successfully.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OptimizeResponse" },
                  example: {
                    scenario_id: "GW-PUB-001-solar-evening-reserve",
                    directive_interpretation: DIRECTIVE_INTERPRETATION_EXAMPLE,
                    hourly_plan: HOURLY_PLAN_EXAMPLE,
                    total_grid_kwh: 2229.5,
                    total_cost_bdt: 22700,
                    peak_grid_kwh: 250,
                    plan_summary:
                      "Solar reduction applied 13:00-15:00; battery reserve 120 kWh enforced 18:00-22:00; grid peaks shifted off-peak.",
                    validation_status: "passed",
                  },
                },
              },
            },
            "400": { description: "Request schema or directive validation failure (code: INVALID_REQUEST or DIRECTIVE_VALIDATION_FAILED)." },
            "422": { description: "Optimization or validation infeasible (code: OPTIMIZATION_FAILED or PLAN_VALIDATION_FAILED)." },
            "503": { description: "LLM interpretation failed (code: LLM_INTERPRETATION_FAILED)." },
          },
        },
      },
      "/sample-cases": {
        get: {
          summary: "Return the public GridWise sample cases",
          tags: ["Samples"],
          responses: {
            "200": {
              description: "Public sample cases and default 24-hour profile.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SampleCasesResponse" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        HealthResponse: {
          type: "object",
          required: ["status", "services"],
          properties: {
            status: { type: "string", enum: ["ok"], example: "ok" },
            services: {
              type: "object",
              required: ["groq", "mongodb"],
              properties: {
                groq: {
                  type: "string",
                  description:
                    "Groq LLM status. `configured` when GROQ_API_KEY is set; `missing` otherwise.",
                  example: "configured",
                },
                mongodb: {
                  type: "string",
                  description:
                    "MongoDB connection status. `connected` only when the driver handshake succeeds; otherwise `disconnected`, `connecting`, or `error`.",
                  example: "connected",
                },
              },
            },
          },
        },
        HourlyRecord: {
          type: "object",
          required: ["hour", "demand_kwh", "solar_kwh", "tariff_bdt_per_kwh"],
          properties: {
            hour: {
              type: "integer",
              minimum: 0,
              maximum: 23,
              description: "Hour-of-day index. 0 = 00:00, 23 = 23:00. Strictly ascending unique across the array.",
              example: 12,
            },
            demand_kwh: {
              type: "number",
              minimum: 0,
              description: "Campus electrical demand for this hour, in kWh. Non-negative.",
              example: 250,
            },
            solar_kwh: {
              type: "number",
              minimum: 0,
              description: "Available solar PV generation for this hour, in kWh. Non-negative.",
              example: 180,
            },
            tariff_bdt_per_kwh: {
              type: "number",
              minimum: 0,
              description: "Grid tariff for this hour, in BDT (Bangladeshi Taka) per kWh. Non-negative.",
              example: 8.5,
            },
          },
        },
        BatteryParams: {
          type: "object",
          required: [
            "capacity_kwh",
            "initial_energy_kwh",
            "minimum_energy_kwh",
            "max_charge_kwh_per_hour",
            "max_discharge_kwh_per_hour",
          ],
          properties: {
            capacity_kwh: {
              type: "number",
              exclusiveMinimum: 0,
              description: "Total battery capacity in kWh. Must satisfy: capacity_kwh >= minimum_energy_kwh.",
              example: 400,
            },
            initial_energy_kwh: {
              type: "number",
              minimum: 0,
              description:
                "Battery state-of-charge at hour 0, in kWh. Must satisfy minimum_energy_kwh <= initial_energy_kwh <= capacity_kwh.",
              example: 200,
            },
            minimum_energy_kwh: {
              type: "number",
              minimum: 0,
              description: "Lower bound on battery state-of-charge in kWh. Non-negative.",
              example: 80,
            },
            max_charge_kwh_per_hour: {
              type: "number",
              exclusiveMinimum: 0,
              description: "Maximum charge power per hour, in kWh/hour. Positive.",
              example: 120,
            },
            max_discharge_kwh_per_hour: {
              type: "number",
              exclusiveMinimum: 0,
              description: "Maximum discharge power per hour, in kWh/hour. Positive.",
              example: 120,
            },
          },
        },
        OptimizeRequest: {
          type: "object",
          required: ["scenario_id", "operator_notes", "hourly", "battery"],
          properties: {
            scenario_id: {
              type: "string",
              minLength: 1,
              description: "Stable client-supplied identifier for this optimization scenario.",
              example: "GW-PUB-001-solar-evening-reserve",
            },
            operator_notes: {
              type: "array",
              items: { type: "string", minLength: 1 },
              maxItems: 50,
              description:
                "Plain-English operator directives. Each note is independently interpreted into a structured directive via the Groq LLM.",
              example: [
                "Solar output will drop to about 20% from 1 PM to 3 PM.",
                "Keep at least 120 kWh from 6 PM to 9 PM.",
              ],
            },
            hourly: {
              type: "array",
              items: { $ref: "#/components/schemas/HourlyRecord" },
              minItems: 24,
              maxItems: 24,
              description:
                "Exactly 24 hourly rows, one per hour-of-day. The backend additionally validates that hours are unique and cover 0-23.",
            },
            battery: { $ref: "#/components/schemas/BatteryParams" },
          },
        },
        StructuredAdjustmentSolarReduction: {
          type: "object",
          description: "solar_reduction: scale available solar by `factor` during `hours`.",
          required: ["hours", "factor"],
          properties: {
            hours: {
              type: "array",
              items: { type: "integer", minimum: 0, maximum: 23 },
              minItems: 1,
              maxItems: 24,
              description: "Ascending-unique hour indices in [0,23].",
              example: [13, 14],
            },
            factor: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Remaining usable fraction of available solar, 0..1.",
              example: 0.2,
            },
          },
        },
        StructuredAdjustmentMinimumBatteryReserve: {
          type: "object",
          description: "minimum_battery_reserve: enforce battery state-of-charge floor during `hours`.",
          required: ["hours", "reserve_kwh"],
          properties: {
            hours: {
              type: "array",
              items: { type: "integer", minimum: 0, maximum: 23 },
              minItems: 1,
              maxItems: 24,
              example: [18, 19, 20, 21],
            },
            reserve_kwh: {
              type: "number",
              minimum: 0,
              description: "Required minimum state-of-charge, in kWh.",
              example: 120,
            },
            is_percentage: { type: "boolean", default: false },
            percentage: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Alternative percentage reserve. Required when is_percentage is true.",
            },
          },
        },
        StructuredAdjustmentWindowHours: {
          type: "object",
          description: "Used for no_charge_window and no_discharge_window.",
          required: ["hours"],
          properties: {
            hours: {
              type: "array",
              items: { type: "integer", minimum: 0, maximum: 23 },
              minItems: 1,
              maxItems: 24,
              example: [0, 1, 2, 3, 4, 5],
            },
          },
        },
        StructuredAdjustmentMaxGridWindow: {
          type: "object",
          description: "max_grid_window: cap grid energy per hour during `hours`.",
          required: ["hours", "grid_cap_kwh"],
          properties: {
            hours: {
              type: "array",
              items: { type: "integer", minimum: 0, maximum: 23 },
              minItems: 1,
              maxItems: 24,
              example: [18, 19, 20, 21],
            },
            grid_cap_kwh: {
              type: "number",
              minimum: 0,
              description: "Maximum grid draw per hour, in kWh.",
              example: 200,
            },
          },
        },
        DirectiveInterpretation: {
          type: "object",
          required: ["note_index", "applies", "directive_type", "explanation"],
          properties: {
            note_index: {
              type: "integer",
              minimum: 0,
              description: "Index in the original operator_notes array.",
              example: 0,
            },
            applies: {
              type: "boolean",
              description: "Whether the directive was applied. false when directive_type is 'no_op'.",
              example: true,
            },
            directive_type: {
              type: "string",
              enum: [
                "solar_reduction",
                "minimum_battery_reserve",
                "no_charge_window",
                "no_discharge_window",
                "max_grid_window",
                "no_op",
              ],
              description: "The structured interpretation of the operator note.",
              example: "solar_reduction",
            },
            structured_adjustment: {
              nullable: true,
              description:
                "Structured payload matching `directive_type`. Shape varies by type; null when directive_type is `no_op`.",
              oneOf: [
                { $ref: "#/components/schemas/StructuredAdjustmentSolarReduction" },
                { $ref: "#/components/schemas/StructuredAdjustmentMinimumBatteryReserve" },
                { $ref: "#/components/schemas/StructuredAdjustmentWindowHours" },
                { $ref: "#/components/schemas/StructuredAdjustmentMaxGridWindow" },
                { type: "null" },
              ],
              example: { hours: [13, 14], factor: 0.2 },
            },
            explanation: {
              type: "string",
              description: "Human-readable explanation of how the note was interpreted.",
              example: "Solar output will be reduced to 20% of forecast between hours 13 and 14.",
            },
          },
        },
        HourlyPlanRow: {
          type: "object",
          required: ["hour", "grid_kwh", "solar_used_kwh", "battery_action", "battery_kwh", "battery_energy_after_kwh"],
          properties: {
            hour: {
              type: "integer",
              minimum: 0,
              maximum: 23,
              example: 0,
            },
            grid_kwh: {
              type: "number",
              minimum: 0,
              description: "Grid draw this hour, in kWh.",
              example: 50.25,
            },
            solar_used_kwh: {
              type: "number",
              minimum: 0,
              description: "Solar energy consumed this hour, in kWh.",
              example: 180,
            },
            battery_action: {
              type: "string",
              enum: ["charge", "discharge", "idle"],
              description: "Battery mode this hour.",
              example: "charge",
            },
            battery_kwh: {
              type: "number",
              minimum: 0,
              description: "Energy moved into (charge) or out of (discharge) the battery this hour, in kWh. 0 when idle.",
              example: 30,
            },
            battery_energy_after_kwh: {
              type: "number",
              minimum: 0,
              description: "Battery state-of-charge at end of hour, in kWh.",
              example: 230,
            },
          },
        },
        OptimizeResponse: {
          type: "object",
          required: [
            "scenario_id",
            "directive_interpretation",
            "hourly_plan",
            "total_grid_kwh",
            "total_cost_bdt",
            "peak_grid_kwh",
            "plan_summary",
            "validation_status",
          ],
          properties: {
            scenario_id: { type: "string", example: "GW-PUB-001-solar-evening-reserve" },
            directive_interpretation: {
              type: "array",
              items: { $ref: "#/components/schemas/DirectiveInterpretation" },
            },
            hourly_plan: {
              type: "array",
              minItems: 24,
              maxItems: 24,
              items: { $ref: "#/components/schemas/HourlyPlanRow" },
            },
            total_grid_kwh: {
              type: "number",
              minimum: 0,
              description: "Total grid energy drawn across the 24 hours, in kWh.",
              example: 2229.5,
            },
            total_cost_bdt: {
              type: "number",
              minimum: 0,
              description: "Total grid energy cost, in BDT (Bangladeshi Taka).",
              example: 22700,
            },
            peak_grid_kwh: {
              type: "number",
              minimum: 0,
              description: "Largest single-hour grid draw, in kWh.",
              example: 250,
            },
            plan_summary: {
              type: "string",
              description: "Human-readable summary of the dispatch result.",
              example: "Solar reduction applied 13:00-15:00; battery reserve enforced 18:00-22:00.",
            },
            validation_status: {
              type: "string",
              enum: ["passed", "failed"],
              description: "`passed` when independent verification confirms the LP plan respects all constraints.",
              example: "passed",
            },
          },
        },
        SampleCasesResponse: {
          type: "object",
          required: ["cases", "hourly"],
          properties: {
            cases: {
              type: "array",
              description: "Public GridWise demo scenarios. Each entry is a `SampleCase` with scenario_id, description, operator_notes and battery parameters; pair with the default `hourly` profile to build an OptimizeRequest.",
              items: { type: "object" },
            },
            hourly: {
              type: "array",
              minItems: 24,
              maxItems: 24,
              description: "Default 24-hour campus energy profile (hourly demand, solar, and tariff).",
              items: { $ref: "#/components/schemas/HourlyRecord" },
            },
          },
        },
      },
    },
  },
  apis: [],
});

export const buildApp = (): express.Application => {
  const app = express();
  const allowedOrigins = new Set([
    "https://grid-wise-q74y.vercel.app",
    "https://grid-wise-origin.vercel.app",
    "https://grid-wise-orcin.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ]);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin is not allowed by GridWise CORS policy"));
      }
    },
  }));
  app.use(express.json({ limit: "256kb" }));
  app.use(morgan("combined"));

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "GridWise API Docs",
    }),
  );

  app.get("/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use("/health", healthRouter);
  app.use("/optimize-energy", optimizeRouter);
  app.use("/sample-cases", samplesRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json(
      buildErrorBody("INVALID_REQUEST", `Not Found: ${req.method} ${req.path}`),
    );
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json(buildErrorBody("INTERNAL_ERROR", "Unexpected server error"));
  });

  return app;
};
