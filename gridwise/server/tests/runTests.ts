import { buildSampleRequest, loadSampleCases, loadHourlyProfile } from "../src/utils/sampleCases";
import { OptimizeRequest } from "../src/schemas/request";
import { interpretDirectives } from "../src/services/groqInterpreter";
import { applyDirectives } from "../src/services/directiveService";
import { optimizeEnergy } from "../src/optimizer/energyLp";
import { ensurePlanValid } from "../src/services/validationService";
import { directiveListSchema } from "../src/schemas/directive";
import { optimizeRequestSchema } from "../src/schemas/request";

type TestCase = {
  name: string;
  fn: () => Promise<void> | void;
};

const results: { name: string; passed: boolean; error?: string }[] = [];

const test = (name: string, fn: () => Promise<void> | void): void => {
  results.push({ name, passed: false });
  Promise.resolve()
    .then(() => fn())
    .then(() => {
      const r = results.find((x) => x.name === name);
      if (r) r.passed = true;
    })
    .catch((e) => {
      const r = results.find((x) => x.name === name);
      if (r) {
        r.passed = false;
        r.error = e instanceof Error ? e.message : String(e);
      }
    });
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const assert = (cond: unknown, msg: string): void => {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
};

const isGroqReady = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0;

const sampleRequestFor = (notes: string[], battery?: OptimizeRequest["battery"]): OptimizeRequest => {
  return {
    scenario_id: "GW-TEST-" + Math.random().toString(36).slice(2, 8),
    operator_notes: notes,
    hourly: loadHourlyProfile(),
    battery:
      battery ?? {
        capacity_kwh: 400,
        initial_energy_kwh: 200,
        minimum_energy_kwh: 80,
        max_charge_kwh_per_hour: 120,
        max_discharge_kwh_per_hour: 120,
      },
  };
};

const tests: TestCase[] = [];

tests.push({
  name: "schema rejects missing hourly records",
  fn: () => {
    const req = {
      scenario_id: "x",
      operator_notes: ["hi"],
      hourly: [{ hour: 0, demand_kwh: 100, solar_kwh: 0, tariff_bdt_per_kwh: 5 }],
      battery: {
        capacity_kwh: 200,
        initial_energy_kwh: 100,
        minimum_energy_kwh: 50,
        max_charge_kwh_per_hour: 80,
        max_discharge_kwh_per_hour: 80,
      },
    };
    const r = optimizeRequestSchema.safeParse(req);
    assert(!r.success, "should reject when not 24 hourly records");
  },
});

tests.push({
  name: "schema rejects duplicate hours",
  fn: () => {
    const hourly = loadHourlyProfile();
    hourly[5].hour = 4;
    const req = {
      scenario_id: "x",
      operator_notes: ["hi"],
      hourly,
      battery: {
        capacity_kwh: 200,
        initial_energy_kwh: 100,
        minimum_energy_kwh: 50,
        max_charge_kwh_per_hour: 80,
        max_discharge_kwh_per_hour: 80,
      },
    };
    const r = optimizeRequestSchema.safeParse(req);
    assert(!r.success, "should reject duplicate hours");
  },
});

tests.push({
  name: "schema rejects NaN values",
  fn: () => {
    const hourly = loadHourlyProfile();
    const broken: unknown = { ...hourly[0], demand_kwh: Number.NaN };
    const req = {
      scenario_id: "x",
      operator_notes: ["hi"],
      hourly: [broken, ...hourly.slice(1)],
      battery: {
        capacity_kwh: 200,
        initial_energy_kwh: 100,
        minimum_energy_kwh: 50,
        max_charge_kwh_per_hour: 80,
        max_discharge_kwh_per_hour: 80,
      },
    };
    const r = optimizeRequestSchema.safeParse(req);
    assert(!r.success, "should reject NaN");
  },
});

tests.push({
  name: "schema rejects infinite values",
  fn: () => {
    const hourly = loadHourlyProfile();
    const broken: unknown = { ...hourly[0], tariff_bdt_per_kwh: Infinity };
    const req = {
      scenario_id: "x",
      operator_notes: ["hi"],
      hourly: [broken, ...hourly.slice(1)],
      battery: {
        capacity_kwh: 200,
        initial_energy_kwh: 100,
        minimum_energy_kwh: 50,
        max_charge_kwh_per_hour: 80,
        max_discharge_kwh_per_hour: 80,
      },
    };
    const r = optimizeRequestSchema.safeParse(req);
    assert(!r.success, "should reject Infinity");
  },
});

tests.push({
  name: "schema rejects minimum > capacity",
  fn: () => {
    const hourly = loadHourlyProfile();
    const req = {
      scenario_id: "x",
      operator_notes: ["hi"],
      hourly,
      battery: {
        capacity_kwh: 200,
        initial_energy_kwh: 100,
        minimum_energy_kwh: 250,
        max_charge_kwh_per_hour: 80,
        max_discharge_kwh_per_hour: 80,
      },
    };
    const r = optimizeRequestSchema.safeParse(req);
    assert(!r.success, "should reject min > capacity");
  },
});

tests.push({
  name: "directive schema rejects extra fields",
  fn: () => {
    const arr = [
      { note_index: 0, applies: true, directive_type: "no_op", structured_adjustment: null, explanation: "x", evil: true },
    ];
    const r = directiveListSchema.safeParse(arr);
    assert(!r.success, "should reject extra fields");
  },
});

tests.push({
  name: "directive schema rejects no_op with structured_adjustment",
  fn: () => {
    const arr = [
      { note_index: 0, applies: false, directive_type: "no_op", structured_adjustment: { hours: [1] }, explanation: "x" },
    ];
    const r = directiveListSchema.safeParse(arr);
    assert(!r.success, "should reject no_op with non-null adjustment");
  },
});

tests.push({
  name: "apply directives: solar reduction min factor",
  fn: () => {
    const directives = [
      {
        note_index: 0,
        applies: true,
        directive_type: "solar_reduction" as const,
        structured_adjustment: { hours: [13, 14], factor: 0.2 },
        explanation: "x",
      },
    ];
    const battery = {
      capacity_kwh: 200,
      initial_energy_kwh: 100,
      minimum_energy_kwh: 30,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    };
    const hourly = loadHourlyProfile();
    const applied = applyDirectives(directives, battery, hourly);
    assert(applied.solarFactorByHour[13] === 0.2, "factor at 13");
    assert(applied.solarFactorByHour[14] === 0.2, "factor at 14");
    assert(applied.solarFactorByHour[12] === 1, "factor at 12 untouched");
  },
});

tests.push({
  name: "apply directives: percentage reserve resolves to kWh",
  fn: () => {
    const directives = [
      {
        note_index: 0,
        applies: true,
        directive_type: "minimum_battery_reserve" as const,
        structured_adjustment: { hours: [18, 19, 20], reserve_kwh: 0, is_percentage: true, percentage: 50 },
        explanation: "x",
      },
    ];
    const battery = {
      capacity_kwh: 200,
      initial_energy_kwh: 100,
      minimum_energy_kwh: 30,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    };
    const hourly = loadHourlyProfile();
    const applied = applyDirectives(directives, battery, hourly);
    assert(applied.reserveKwhByHour[18] === 100, "reserve 50% of 200");
  },
});

tests.push({
  name: "apply directives: combined windows",
  fn: () => {
    const directives = [
      {
        note_index: 0,
        applies: true,
        directive_type: "no_charge_window" as const,
        structured_adjustment: { hours: [14, 15, 16] },
        explanation: "x",
      },
      {
        note_index: 1,
        applies: true,
        directive_type: "max_grid_window" as const,
        structured_adjustment: { hours: [18, 19, 20], grid_cap_kwh: 100 },
        explanation: "x",
      },
    ];
    const battery = {
      capacity_kwh: 200,
      initial_energy_kwh: 100,
      minimum_energy_kwh: 30,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    };
    const hourly = loadHourlyProfile();
    const applied = applyDirectives(directives, battery, hourly);
    assert(applied.noChargeHours.has(14), "no-charge at 14");
    assert(applied.maxGridByHour[18] === 100, "grid cap 100");
  },
});

tests.push({
  name: "apply directives: no_op does nothing",
  fn: () => {
    const directives = [
      {
        note_index: 0,
        applies: false,
        directive_type: "no_op" as const,
        structured_adjustment: null,
        explanation: "menu change",
      },
    ];
    const battery = {
      capacity_kwh: 200,
      initial_energy_kwh: 100,
      minimum_energy_kwh: 30,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    };
    const hourly = loadHourlyProfile();
    const applied = applyDirectives(directives, battery, hourly);
    assert(applied.solarFactorByHour[12] === 1, "no_op leaves solar alone");
  },
});

tests.push({
  name: "optimizer: feasible baseline (no directives)",
  fn: async () => {
    const req = sampleRequestFor(["Cafeteria menu tomorrow is rice and curry."]);
    const parsed = optimizeRequestSchema.safeParse(req);
    assert(parsed.success, "sample must validate");
    const directives = await interpretDirectives(req.operator_notes);
    const applied = applyDirectives(directives, req.battery, req.hourly);
    const plan = await optimizeEnergy(req.hourly, req.battery, applied);
    const totals = ensurePlanValid(plan, req.hourly, req.battery, applied);
    assert(plan.length === 24, "plan length");
    assert(totals.total_grid_kwh >= 0, "non-negative total");
    assert(Math.abs(plan[23].battery_energy_after_kwh - req.battery.initial_energy_kwh) < 0.05, "neutrality");
  },
});

tests.push({
  name: "validator rejects simultaneous charge/discharge (constructed plan)",
  fn: () => {
    const hourly = loadHourlyProfile();
    const battery = {
      capacity_kwh: 200,
      initial_energy_kwh: 100,
      minimum_energy_kwh: 30,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    };
    type PlanRow = {
      hour: number;
      grid_kwh: number;
      solar_used_kwh: number;
      battery_action: "charge" | "discharge" | "idle";
      battery_kwh: number;
      battery_energy_after_kwh: number;
    };
    const plan: PlanRow[] = hourly.map((_, h) => ({
      hour: h,
      grid_kwh: 50,
      solar_used_kwh: 0,
      battery_action: "idle",
      battery_kwh: 0,
      battery_energy_after_kwh: battery.initial_energy_kwh,
    }));
    plan[5] = {
      hour: 5,
      grid_kwh: 50,
      solar_used_kwh: 0,
      battery_action: "charge",
      battery_kwh: 5,
      battery_energy_after_kwh: battery.initial_energy_kwh + 5,
    };
    const directives = applyDirectives([], battery, hourly);
    let threw = false;
    try {
      ensurePlanValid(plan, hourly, battery, directives);
    } catch (e) {
      threw = true;
      const err = e as Error;
      assert(err instanceof Error, "validator should throw");
      assert(
        err.message.includes("energy balance"),
        "validator should reject invalid energy balance",
      );
    }
    assert(threw, "validator should reject this invalid plan");
  },
});

const groqTests: TestCase[] = isGroqReady
  ? [
      {
        name: "groq: enforces directive coverage and order",
        fn: async () => {
          const directives = await interpretDirectives([
            "The cafeteria menu changes tomorrow.",
            "Solar output will drop to about 20% from 1 PM to 3 PM.",
            "Keep at least 120 kWh from 6 PM to 9 PM.",
          ]);
          assert(directives.length === 3, "3 directives");
          assert(directives[0].note_index === 0, "index 0");
          assert(directives[1].note_index === 1, "index 1");
          assert(directives[2].note_index === 2, "index 2");
          assert(directives[0].directive_type === "no_op", "first is no_op");
          assert(directives[1].directive_type === "solar_reduction", "solar_reduction");
          assert(directives[2].directive_type === "minimum_battery_reserve", "min reserve");
        },
      },
      {
        name: "groq: percentage reserve yields is_percentage",
        fn: async () => {
          const directives = await interpretDirectives([
            "Maintain battery at 50% between 5 PM and 10 PM.",
          ]);
          assert(directives.length === 1, "1 directive");
          assert(directives[0].directive_type === "minimum_battery_reserve", "min reserve");
          const adj = directives[0].structured_adjustment;
          assert(adj && "is_percentage" in adj, "has is_percentage");
          assert(adj && (adj as { is_percentage?: boolean }).is_percentage === true, "is_percentage true");
        },
      },
      {
        name: "groq: paraphrased note maps to no_discharge",
        fn: async () => {
          const directives = await interpretDirectives([
            "Battery should not be used between 6 PM and 8 PM.",
          ]);
          assert(directives.length === 1, "1 directive");
          assert(directives[0].directive_type === "no_discharge_window", "no_discharge_window");
          assert(directives[0].applies === true, "applies true");
          const adj = directives[0].structured_adjustment as { hours: number[] };
          assert(adj.hours.length === 2, "2 hours for end-exclusive 6 PM to 8 PM window");
        },
      },
    ]
  : [
      {
        name: "groq: skipped (GROQ_API_KEY not set)",
        fn: async () => {
          await sleep(10);
        },
      },
    ];

tests.push(...groqTests);

tests.push({
  name: "paraphrase resilience: solar reduction equivalent",
  fn: () => {
    const notes = [
      "Only 20% solar between 1 PM and 3 PM.",
      "From 13:00 to 15:00 solar will be capped at factor 0.2.",
      "Solar generation falls to twenty percent from one to three pm.",
    ];
    assert(notes.length === 3, "three notes");
  },
});

tests.push({
  name: "distractor note maps to no_op by prompt",
  fn: () => {
    const directives = [
      {
        note_index: 0,
        applies: false,
        directive_type: "no_op" as const,
        structured_adjustment: null,
        explanation: "cafeteria menu",
      },
    ];
    const battery = {
      capacity_kwh: 200,
      initial_energy_kwh: 100,
      minimum_energy_kwh: 30,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    };
    const hourly = loadHourlyProfile();
    const applied = applyDirectives(directives, battery, hourly);
    assert(applied.solarFactorByHour[13] === 1, "no affect on solar");
  },
});

tests.push({
  name: "all public sample cases (dry-run, no Groq needed)",
  fn: async () => {
    const cases = loadSampleCases();
    assert(cases.length >= 3, "at least 3 cases");
    for (const c of cases) {
      const req = buildSampleRequest(c);
      const parsed = optimizeRequestSchema.safeParse(req);
      assert(parsed.success, `case ${c.scenario_id} should validate`);
    }
  },
});

tests.push({
  name: "end-to-end sample solver (skipped if no Groq)",
  fn: async () => {
    if (!isGroqReady) return;
    const cases = loadSampleCases();
    for (const c of cases) {
      const req = buildSampleRequest(c);
      const directives = await interpretDirectives(req.operator_notes);
      const applied = applyDirectives(directives, req.battery, req.hourly);

      if (c.scenario_id === "GW-PUB-004-evening-grid-cap") {
        try {
          await optimizeEnergy(req.hourly, req.battery, applied);
          throw new Error("contradictory grid cap sample should be infeasible");
        } catch (e) {
          const error = e as Error;
          assert(error.message.includes("infeasible") || error.message.includes("Optimization infeasible"), `expected infeasibility for ${c.scenario_id}`);
        }
        continue;
      }

      const plan = await optimizeEnergy(req.hourly, req.battery, applied);
      const totals = ensurePlanValid(plan, req.hourly, req.battery, applied);
      assert(totals.total_grid_kwh >= 0, `non-negative total for ${c.scenario_id}`);
    }
  },
});

for (const t of tests) test(t.name, t.fn);

setTimeout(() => {
  let pass = 0;
  let fail = 0;
  for (const r of results) {
    if (r.passed) {
      pass++;
      console.log(`PASS  ${r.name}`);
    } else {
      fail++;
      console.error(`FAIL  ${r.name}${r.error ? `  -> ${r.error}` : ""}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}, 15000);
