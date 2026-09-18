import { Glyph } from "../components/ui/Icon";
import { InlineRow, PageHeader, SectionCard } from "../components/ui/SectionCard";
import { Glyph as _G } from "../components/ui/Icon";
const _ = _G;
import type {} from "../types";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  desc: string;
};

const endpoints: Endpoint[] = [
  { method: "GET", path: "/health", desc: "Service probe. Returns { status, services: { mongodb, groq } }." },
  { method: "GET", path: "/sample-cases", desc: "Returns curated scenarios { cases: [...], hourly: [...24] }." },
  { method: "POST", path: "/optimize-energy", desc: "Run the LP solver with operator notes. Body: { scenario_id, operator_notes, hourly, battery }." },
];

const methodColor = (m: Endpoint["method"]) => m === "GET" ? "bg-ok-50 text-ok-700 border-ok-100" : "bg-brand-50 text-brand-700 border-brand-100";

export function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference"
        title="API Documentation"
        description="The complete HTTP surface used by the GridWise client. All endpoints are JSON-in / JSON-out. Operator notes are interpreted via Groq; math is performed locally by the GLPK LP solver."
      />

      <SectionCard title="Endpoints" subtitle="Public routes exposed by the Express server." icon={<Glyph name="list" size={14} />} bodyClassName="p-0">
        <div className="overflow-hidden">
          <div className="grid grid-cols-12 gap-3 border-b border-canvas-border bg-canvas-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            <div className="col-span-2">Method</div>
            <div className="col-span-4">Path</div>
            <div className="col-span-6">Description</div>
          </div>
          {endpoints.map((e) => (
            <div key={e.path} className="grid grid-cols-12 gap-3 border-b border-canvas-border px-4 py-3 last:border-b-0">
              <div className="col-span-2"><span className={`gw-pill border ${methodColor(e.method)}`}>{e.method}</span></div>
              <div className="col-span-4"><code className="font-mono text-[12.5px] font-semibold text-ink-900">{e.path}</code></div>
              <div className="col-span-6 text-[12.5px] text-ink-700">{e.desc}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Request Schema" subtitle="POST /optimize-energy body shape." icon={<Glyph name="doc" size={14} />}>
        <pre className="overflow-auto rounded-md bg-canvas-muted/60 p-3 text-[12px] leading-relaxed text-ink-800">
{`{
  "scenario_id": "interactive-run",
  "operator_notes": ["Keep at least 120 kWh from 6 PM to 9 PM."],
  "hourly": [ { "hour": 0, "demand_kwh": 50, "solar_kwh": 0, "tariff_bdt_per_kwh": 8.5 }, ... 24 entries ],
  "battery": {
    "capacity_kwh": 200,
    "initial_energy_kwh": 100,
    "minimum_energy_kwh": 30,
    "max_charge_kwh_per_hour": 50,
    "max_discharge_kwh_per_hour": 50
  }
}`}
        </pre>
      </SectionCard>

      <SectionCard title="Response Schema" subtitle="OptimizeResponse - validates with Zod on the client." icon={<Glyph name="activity" size={14} />}>
        <pre className="overflow-auto rounded-md bg-canvas-muted/60 p-3 text-[12px] leading-relaxed text-ink-800">
{`{
  "scenario_id": "interactive-run",
  "directive_interpretation": [ /* DirectiveInterpretation[] */ ],
  "hourly_plan": [ /* 24 HourlyPlan entries */ ],
  "total_grid_kwh": 245.12,
  "total_cost_bdt": 2410.55,
  "peak_grid_kwh": 55.6,
  "plan_summary": "24-hour plan...",
  "validation_status": "passed"
}`}
        </pre>
      </SectionCard>

      <SectionCard title="Error Codes" subtitle="Returned in the error field as CODE: message." icon={<Glyph name="warn" size={14} />}>
        <div className="divide-y divide-canvas-border">
          <InlineRow label="HTTP_ERROR" value="Backend unreachable or non-2xx response" />
          <InlineRow label="LLM_INTERPRETATION_FAILED" value="Groq rejected or could not parse directives" />
          <InlineRow label="DIRECTIVE_VALIDATION_FAILED" value="Structured adjustment failed schema check" />
          <InlineRow label="OPTIMIZATION_FAILED" value="LP solver reports no feasible solution" />
          <InlineRow label="INVALID_REQUEST" value="Request body failed Zod validation" />
          <InlineRow label="PLAN_VALIDATION_FAILED" value="Solver returned a plan violating constraints" />
        </div>
      </SectionCard>
    </div>
  );
}
