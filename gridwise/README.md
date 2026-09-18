# GridWise

Smart campus energy optimizer. Operator notes in plain English → structured directives via Groq LLM → optimal 24-hour solar/battery/grid dispatch via LP (glpk.js) → React dashboard.

## Architecture

```
client (React + Vite + Tailwind + Recharts)
        │  HTTP
        ▼
server (Express + TypeScript)
   ├─ /optimize-energy  POST   interpret → apply directives → LP solve → validate → persist
   ├─ /sample-cases     GET    serve public-sample-cases/sample-cases.json
   └─ /health           GET    API liveness + service status
        │
        ├─ Groq API (openai/gpt-oss-120b by default)       — directive interpretation only
        ├─ glpk.js (LP solver)              — math (deterministic, fast)
        └─ MongoDB Atlas                   — run history (optional, graceful fallback)
```

Hard rule: the LLM never touches numbers. All math comes from the LP solver. The validator is a fully independent re-check.

## Project layout

```
gridwise/
├── .env.example             # server env vars (copy to .env and fill in)
├── docker-compose.yml       # production server container
├── public-sample-cases/     # shipped sample scenarios
├── server/                  # Node 24 + TypeScript API
│   ├── src/
│   │   ├── app.ts / server.ts
│   │   ├── routes/          # health, optimize, samples
│   │   ├── controllers/     # optimizeController, persistenceController, samplesController
│   │   ├── services/        # groqInterpreter, directiveService, validationService
│   │   ├── optimizer/       # energyLp (glpk.js), glpkClient (dynamic ESM import)
│   │   ├── schemas/         # Zod: request, directive
│   │   ├── models/          # Mongoose optimizationRun
│   │   ├── config/, utils/, middleware/, types/
│   │   └── tests/           # liveDebug.js, liveSmoke.js, runSampleCases.cjs
│   ├── Dockerfile           # multi-stage node:24-alpine
│   └── package.json
└── client/                  # React 18 + Vite + Tailwind + Recharts
    ├── src/
    │   ├── App.tsx
    │   ├── pages/           # OptimizePage, SampleCasesPage
    │   ├── components/      # OperatorNotesInput, DirectivesList, PlanChart, HourlyPlanTable
    │   ├── hooks/           # useOptimization
    │   ├── services/        # api.ts (typed fetch wrapper)
    │   ├── types/, utils/
    │   └── main.tsx
    ├── vite.config.ts       # proxies /api → :4000
    └── package.json
```

## Environment variables (server `.env`)

| Key | Required | Description |
| --- | --- | --- |
| `PORT` | no | defaults to `4000` |
| `NODE_ENV` | no | `development` or `production` |
| `LOG_LEVEL` | no | `debug`/`info`/`warn`/`error` |
| `MONGODB_URI` | no | Atlas connection string. If missing or unreachable, persistence is skipped (warning only). |
| `MONGODB_DNS_SERVERS` | no | Comma-separated DNS servers for `mongodb+srv` discovery; defaults to `1.1.1.1,8.8.8.8`. |
| `GROQ_API_KEY` | yes (for LLM) | Groq API key |
| `GROQ_MODEL` | no | defaults to `openai/gpt-oss-120b` |
| `GROQ_TIMEOUT_MS` | no | defaults to `20000` |

## Local development

```bash
# 1. Configure server
cp .env.example .env        # then fill in GROQ_API_KEY and (optionally) MONGODB_URI

# 2. Run server (port 4000)
cd server
npm install
npm run build
npm start                   # production
# or:
npm run dev                 # ts-node-dev with watch

# 3. Run client (port 5173, proxies /api to :4000)
cd ../client
npm install
npm run dev
```

Open <http://localhost:5173>.

## API

### `GET /health`

```json
{ "status": "ok", "services": { "groq": "configured", "mongodb": "configured (connected)" } }
```

### `GET /sample-cases`

Returns `{ cases: SampleCase[] }` from `public-sample-cases/sample-cases.json`.

### `POST /optimize-energy`

Request:

```json
{
  "scenario_id": "string",
  "operator_notes": ["string", "..."],
  "hourly": [
    { "hour": 0, "demand_kwh": 60, "solar_kwh": 0,   "tariff_bdt_per_kwh": 8 },
    { "hour": 1, "demand_kwh": 60, "solar_kwh": 0,   "tariff_bdt_per_kwh": 8 }
  ],
  "battery": {
    "capacity_kwh": 400,
    "initial_energy_kwh": 200,
    "minimum_energy_kwh": 80,
    "max_charge_kwh_per_hour": 120,
    "max_discharge_kwh_per_hour": 120
  }
}
```

Response (200):

```json
{
  "scenario_id": "...",
  "directive_interpretation": [
    { "note_index": 0, "applies": true, "directive_type": "solar_reduction",
      "structured_adjustment": { "hours": [13,14], "factor": 0.2 },
      "explanation": "..." }
  ],
  "hourly_plan": [
    { "hour": 0, "grid_kwh": 60, "solar_used_kwh": 0,
      "battery_action": "idle", "battery_kwh": 0, "battery_energy_after_kwh": 200 }
  ],
  "total_grid_kwh": 2559.19,
  "total_cost_bdt": 26297.25,
  "peak_grid_kwh": 300.10,
  "plan_summary": "...",
  "validation_status": "passed"
}
```

Errors:

| Status | Code | Meaning |
| ------ | ---- | ------- |
| 400 | `INVALID_REQUEST` | Zod schema mismatch |
| 400 | `DIRECTIVE_VALIDATION_FAILED` | LLM returned malformed directives |
| 422 | `OPTIMIZATION_FAILED` | LP infeasible (constraints contradictory) |
| 422 | `PLAN_VALIDATION_FAILED` | Independent validator rejected the LP plan |
| 503 | `LLM_INTERPRETATION_FAILED` | Groq unreachable / bad response |

## curl examples

```bash
# Health
curl -s http://127.0.0.1:4000/health | jq

# Sample cases
curl -s http://127.0.0.1:4000/sample-cases | jq '.cases | length'

# Optimize (use the public-sample-cases payload)
curl -s -X POST http://127.0.0.1:4000/optimize-energy \
  -H 'content-type: application/json' \
  -d @optimize-payload.json | jq '.total_grid_kwh, .total_cost_bdt, .peak_grid_kwh'
```

## Directive types

| Type | Structured adjustment | Example note |
| ---- | --------------------- | ------------ |
| `solar_reduction` | `{ hours: number[], factor: 0..1 }` | "Solar drops to 20% from 1 PM to 3 PM." |
| `minimum_battery_reserve` | `{ hours: number[], reserve_kwh: number, is_percentage?: bool, percentage?: number }` | "Keep at least 50% from 6 PM to 10 PM." |
| `no_charge_window` | `{ hours: number[] }` | "Do not charge from 2 PM to 5 PM." |
| `no_discharge_window` | `{ hours: number[] }` | "Battery discharge unavailable from 7 PM to 9 PM." |
| `max_grid_window` | `{ hours: number[], grid_cap_kwh: number }` | "Grid import must stay below 155 kWh from 6 PM to 9 PM." |
| `no_op` | `null` (applies=false) | Unrelated notes (cafeteria menu, etc.) |

## LP formulation (per hour)

Variables:

- `g_h` — grid import, `0 ≤ g_h ≤ max_grid[h]`
- `su_h` — solar used, `0 ≤ su_h ≤ effective_solar[h]`
- `p_h` — battery power (`+` charge, `−` discharge), `−dMax ≤ p_h ≤ +cMax`
- `b_h` — battery energy at end of hour `h`, `minKwh ≤ b_h ≤ capacity`

Constraints:

- Balance: `g_h + su_h − p_h = demand_h` (24 rows)
- Transition: `b_h − p_h − b_{h-1} = 0` for `h ≥ 1` (23 rows)
- Initial: `b_0 − p_0 = initial_energy_kwh`
- Neutrality: `b_{23} = initial_energy_kwh`

Objective: minimize `Σ (tariff_h × g_h)`.

## Tests

```bash
cd server
npm test                       # schema, directives, optimizer, optional Groq
node tests/liveDebug.js        # direct LP + validator on a sample
node tests/liveSmoke.js        # /optimize-energy on combined directives
node tests/runSampleCases.cjs  # all public sample cases against a running server
```

`runSampleCases.cjs` uses `public-sample-cases/hourly-profile.json`. GW-PUB-004 is a contradictory grid-cap + no-discharge scenario and is expected to return HTTP 422 `OPTIMIZATION_FAILED`.

## Docker

```bash
docker compose up --build
```

The `server` service builds from the repository root with `server/Dockerfile` (multi-stage `node:24-alpine`) and includes `public-sample-cases/` for `GET /sample-cases`. MongoDB is external (Atlas); Groq is external.

## Production notes

- glpk.js is ESM-only; we load it via dynamic `import()` from CJS in `glpkClient.ts`.
- MongoDB persistence is fire-and-forget — if the cluster is unreachable the API still serves 200.
- The LLM is rate-limited and may fail; errors propagate as 503 with `LLM_INTERPRETATION_FAILED`.
- All requests are validated by Zod before any LLM call (cheap rejection).
- The validator (`validationService.ensurePlanValid`) is fully independent of the LP solver — it re-derives every constraint from the returned plan and fails loud on any mismatch.
