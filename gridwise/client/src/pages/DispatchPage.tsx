import { useEffect, useMemo, useState } from "react";
import { useOptimization } from "../hooks/useOptimization";
import { api } from "../services/api";
import { defaultBattery, defaultHourlyProfile } from "../utils/hourly";
import type { HourlyPlan, HourlyRecord } from "../types";
import { AlertCard } from "../components/ui/AlertCard";
import { Glyph } from "../components/ui/Icon";
import { InlineRow, PageHeader, SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard, MetricGrid } from "../components/ui/MetricCard";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PlanChart } from "../components/PlanChart";
import { HourlyPlanTable } from "../components/HourlyPlanTable";

function parseError(error: string | null): { code: string; message: string } | null {
  if (!error) return null;
  const idx = error.indexOf(":");
  if (idx < 0) return { code: "ERROR", message: error };
  return { code: error.slice(0, idx).trim(), message: error.slice(idx + 1).trim() };
}

const DEMO_NOTES = [
  "Solar output will drop to about 20% from 1 PM to 3 PM.",
  "Keep at least 120 kWh from 6 PM to 9 PM.",
  "Do not charge from 2 PM to 5 PM.",
  "Grid import must stay below 155 kWh from 6 PM to 9 PM.",
];

export function DispatchPage() {
  const [notes, setNotes] = useState<string[]>(DEMO_NOTES);
  const [hourly, setHourly] = useState<HourlyRecord[]>(defaultHourlyProfile());
  const [battery] = useState(defaultBattery());
  const { loading, result, error, processingMs, optimize } = useOptimization();

  useEffect(() => {
    api.sampleCases().then((r) => {
      if (Array.isArray(r.hourly) && r.hourly.length === 24) setHourly(r.hourly);
    }).catch(() => undefined);
  }, []);

  const submit = () => optimize("dispatch-demo", notes, hourly, battery);

  const err = parseError(error);
  const isInfeasible = err?.code === "OPTIMIZATION_FAILED";

  const totals = useMemo(() => {
    const plan = result?.hourly_plan ?? [] as HourlyPlan[];
    let grid = 0, solar = 0, charge = 0, discharge = 0;
    for (const p of plan) {
      grid += p.grid_kwh;
      solar += p.solar_used_kwh;
      if (p.battery_action === "charge") charge += p.battery_kwh;
      if (p.battery_action === "discharge") discharge += p.battery_kwh;
    }
    return { grid, solar, charge, discharge };
  }, [result]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dispatch"
        title="24-hour Dispatch Lab"
        description="Compute a constraint-valid 24-hour solar/battery/grid dispatch from operator notes. Re-run with different directives to compare how the plan shifts."
        actions={
          <button type="button" onClick={submit} disabled={loading} className="gw-btn-primary">
            {loading ? <Spinner size={13} /> : <Glyph name="play" size={13} />}
            {loading ? "Running..." : "Run dispatch"}
          </button>
        }
      />

      <SectionCard title="Operator Notes" subtitle="Natural-language directives. Interpreted via Groq, then converted to LP constraints." icon={<Glyph name="doc" size={14} />}>
        <ul className="space-y-2">
          {notes.map((n, i) => (
            <li key={i} className="flex items-start gap-3 rounded-md bg-canvas-muted/60 px-3 py-2 text-[12.5px] text-ink-700">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-canvas text-[10.5px] font-semibold text-ink-500 ring-1 ring-canvas-border">{i + 1}</span>
              <span className="flex-1">{n}</span>
              <button type="button" onClick={() => setNotes(notes.filter((_, j) => j !== i))} className="text-ink-400 hover:text-crit-600" aria-label="Remove note">
                <Glyph name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
        <AddNote onAdd={(t) => setNotes([...notes, t])} />
      </SectionCard>

      {error && isInfeasible && (
        <AlertCard tone="crit" title="No feasible dispatch" description={err?.message ?? ""} />
      )}
      {error && !isInfeasible && (
        <AlertCard tone="warn" title="Dispatch error" description={err?.message ?? error} />
      )}

      {!result && !loading && !error && (
        <EmptyState
          icon={<Glyph name="activity" size={16} />}
          title="No dispatch yet"
          description="Click Run dispatch to compute a 24-hour plan from these directives."
        />
      )}

      {result && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">Dispatch Results</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-500">Computed in {processingMs} ms - Validation {result.validation_status.toUpperCase()}</p>
              </div>
              <StatusBadge tone={result.validation_status === "passed" ? "ok" : "crit"} label="Validation" detail={result.validation_status.toUpperCase()} />
            </div>
            <MetricGrid>
              <MetricCard label="Total grid" value={totals.grid.toFixed(2)} unit="kWh" icon={<Glyph name="grid" size={14} />} tone="brand" />
              <MetricCard label="Total solar" value={totals.solar.toFixed(2)} unit="kWh" icon={<Glyph name="sun" size={14} />} tone="ok" />
              <MetricCard label="Charged" value={totals.charge.toFixed(2)} unit="kWh" icon={<Glyph name="battery" size={14} />} />
              <MetricCard label="Discharged" value={totals.discharge.toFixed(2)} unit="kWh" icon={<Glyph name="battery" size={14} />} tone="warn" />
              <MetricCard label="Peak grid" value={result.peak_grid_kwh.toFixed(2)} unit="kWh" icon={<Glyph name="gauge" size={14} />} tone="crit" />
              <MetricCard label="Total cost" value={result.total_cost_bdt.toFixed(2)} unit="BDT" icon={<Glyph name="coin" size={14} />} tone="warn" />
            </MetricGrid>
          </section>

          <SectionCard title="24-hour Dispatch" subtitle="Stacked source allocation and battery state-of-charge." icon={<Glyph name="activity" size={14} />}>
            <PlanChart plan={result.hourly_plan} hourly={hourly} />
          </SectionCard>

          <SectionCard title="Hourly Plan" subtitle="Hour-by-hour dispatch table." icon={<Glyph name="list" size={14} />} bodyClassName="p-0">
            <div className="p-3">
              <HourlyPlanTable plan={result.hourly_plan} hourly={hourly} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function AddNote({ onAdd }: { onAdd: (text: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Add operator directive..."
        className="gw-input flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) { onAdd(v.trim()); setV(""); }
        }}
      />
      <button type="button" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }} className="gw-btn-outline">
        <Glyph name="plus" size={12} />
        Add
      </button>
    </div>
  );
}
