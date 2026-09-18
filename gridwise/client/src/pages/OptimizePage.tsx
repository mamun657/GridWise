import { useEffect, useMemo, useState } from "react";
import { OperatorNotesInput } from "../components/OperatorNotesInput";
import { DirectivesGrid } from "../components/ui/DirectiveCard";
import { HourlyPlanTable } from "../components/HourlyPlanTable";
import { PlanChart } from "../components/PlanChart";
import { useOptimization } from "../hooks/useOptimization";
import { api } from "../services/api";
import { defaultBattery, defaultHourlyProfile } from "../utils/hourly";
import type { HourlyRecord } from "../types";
import { AlertCard } from "../components/ui/AlertCard";
import { Glyph } from "../components/ui/Icon";
import {
  InlineRow,
  PageHeader,
  PanelTitle,
  SectionCard,
} from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard, MetricGrid } from "../components/ui/MetricCard";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";

const SAMPLE_NOTES = [
  "Solar output will drop to about 20% from 1 PM to 3 PM.",
  "Keep at least 120 kWh from 6 PM to 9 PM.",
  "Do not charge from 2 PM to 5 PM.",
  "Grid import must stay below 155 kWh from 6 PM to 9 PM.",
];

function parseError(error: string | null): { code: string; message: string } | null {
  if (!error) return null;
  const idx = error.indexOf(":");
  if (idx < 0) return { code: "ERROR", message: error };
  return { code: error.slice(0, idx).trim(), message: error.slice(idx + 1).trim() };
}

export function OptimizePage() {
  const [notes, setNotes] = useState<string[]>(SAMPLE_NOTES);
  const [hourly, setHourly] = useState<HourlyRecord[]>(defaultHourlyProfile());
  const [battery] = useState(defaultBattery());
  const [hourlySource, setHourlySource] = useState<"default" | "server">("default");
  const { loading, result, error, processingMs, optimize } = useOptimization();

  useEffect(() => {
    api
      .sampleCases()
      .then((r) => {
        if (Array.isArray(r.hourly) && r.hourly.length === 24) {
          setHourly(r.hourly);
          setHourlySource("server");
        }
      })
      .catch(() => undefined);
  }, []);

  const submit = () => optimize("interactive-run", notes, hourly, battery);

  const totalDemand = useMemo(
    () => hourly.reduce((s, h) => s + h.demand_kwh, 0),
    [hourly],
  );
  const totalSolar = useMemo(
    () => hourly.reduce((s, h) => s + h.solar_kwh, 0),
    [hourly],
  );
  const peakTariff = useMemo(
    () => hourly.reduce((m, h) => (h.tariff_bdt_per_kwh > m ? h.tariff_bdt_per_kwh : m), 0),
    [hourly],
  );

  const err = parseError(error);
  const isInfeasible = err?.code === "OPTIMIZATION_FAILED";
  const isGroqFailed = err?.code === "LLM_INTERPRETATION_FAILED";
  const isNetworkError = err?.code === "BACKEND_UNAVAILABLE" || err?.code === "API_TIMEOUT";
  const isHttpError = err?.code.startsWith("HTTP_") ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Interactive Optimization"
        description="Use natural-language operator instructions. GridWise interprets directives with Groq and computes a constraint-valid 24-hour energy dispatch."
        actions={
          hourlySource === "server" ? (
            <StatusBadge tone="ok" label="Profile" detail="Server (official)" />
          ) : (
            <StatusBadge tone="neutral" label="Profile" detail="Local default" />
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard
            title="Directives Workspace"
            subtitle="Add, edit, or remove operator instructions before dispatch."
            icon={<Glyph name="doc" size={14} />}
          >
            <OperatorNotesInput
              notes={notes}
              onChange={setNotes}
              loading={loading}
              onOptimize={submit}
              onReset={() => setNotes(SAMPLE_NOTES)}
              processingMs={processingMs}
            />
          </SectionCard>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <SectionCard
            title="Energy Configuration"
            subtitle="Battery parameters and 24-hour profile used by the LP solver."
            icon={<Glyph name="battery" size={14} />}
          >
            <div className="divide-y divide-canvas-border">
              <InlineRow
                label={<span className="inline-flex items-center gap-2"><Glyph name="battery" size={12} /> Battery capacity</span>}
                value={battery.capacity_kwh}
                unit="kWh"
              />
              <InlineRow
                label={<span className="inline-flex items-center gap-2"><Glyph name="bolt" size={12} /> Initial stored</span>}
                value={battery.initial_energy_kwh}
                unit="kWh"
              />
              <InlineRow
                label="Minimum reserve"
                value={battery.minimum_energy_kwh}
                unit="kWh"
              />
              <InlineRow
                label="Max charge rate"
                value={`+-${battery.max_charge_kwh_per_hour}`}
                unit="kWh/h"
              />
              <InlineRow
                label="Max discharge rate"
                value={`+-${battery.max_discharge_kwh_per_hour}`}
                unit="kWh/h"
              />
            </div>
            <div className="gw-divider my-4" />
            <PanelTitle hint="From 24-hour profile">Daily Profile</PanelTitle>
            <div className="mt-2 divide-y divide-canvas-border">
              <InlineRow label="Total demand" value={totalDemand.toFixed(1)} unit="kWh" />
              <InlineRow label="Total solar" value={totalSolar.toFixed(1)} unit="kWh" />
              <InlineRow label="Peak tariff" value={peakTariff.toFixed(2)} unit="BDT/kWh" />
              <InlineRow label="Profile hours" value={hourly.length} />
            </div>
          </SectionCard>

          <SectionCard
            title="Dispatch Status"
            subtitle="Live status of the most recent optimization attempt."
            icon={<Glyph name="activity" size={14} />}
          >
            {loading && (
              <div className="flex items-center gap-3 rounded-md bg-canvas-muted/60 px-3 py-3 text-[12.5px] text-ink-500">
                <Spinner size={14} className="text-brand-600" />
                <span>Computing optimal dispatch via GLPK...</span>
              </div>
            )}
            {!loading && result && (
              <div className="divide-y divide-canvas-border">
                <InlineRow label="Validation" value={result.validation_status.toUpperCase()} />
                <InlineRow label="Directives applied" value={result.directive_interpretation.filter((d) => d.applies).length} />
                <InlineRow label="Total grid" value={result.total_grid_kwh.toFixed(2)} unit="kWh" />
                <InlineRow label="Total cost" value={result.total_cost_bdt.toFixed(2)} unit="BDT" />
              </div>
            )}
            {!loading && !result && !error && (
              <EmptyState
                icon={<Glyph name="activity" size={16} />}
                title="No dispatch yet"
                description="Run Optimize plan to compute a 24-hour dispatch from these directives."
              />
            )}
          </SectionCard>
        </div>
      </div>

      {error && isInfeasible && (
        <AlertCard
          tone="crit"
          title="No feasible dispatch"
          description="The configured constraints cannot be simultaneously satisfied for this scenario. Adjust directives (e.g. relax the grid cap, remove conflicting windows, or raise the minimum reserve) and re-run."
          action={
            <button type="button" onClick={submit} disabled={loading} className="gw-btn-outline">
              <Glyph name="refresh" size={12} />
              Retry
            </button>
          }
        />
      )}

      {error && !isInfeasible && (
        <AlertCard
          tone={isGroqFailed ? "warn" : isNetworkError ? "crit" : "warn"}
          title={
            isGroqFailed
              ? "Directive interpretation failed"
              : isNetworkError
                ? err?.code === "API_TIMEOUT" ? "Backend request timed out" : "Backend unavailable"
                : isHttpError
                  ? err?.code === "HTTP_404" ? "Backend endpoint not found" : "Backend returned an HTTP error"
                : "Optimization error"
          }
          description={err?.message ?? error}
        />
      )}

      {result && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">
                  Optimization Complete
                </h2>
                <p className="mt-0.5 text-[12.5px] text-ink-500">
                  24-hour plan computed in {processingMs} ms -{" "}
                  {result.validation_status === "passed" ? "Validation passed" : "Validation failed"}
                </p>
              </div>
              <StatusBadge
                tone={result.validation_status === "passed" ? "ok" : "crit"}
                label="Validation"
                detail={result.validation_status.toUpperCase()}
              />
            </div>
            <MetricGrid>
              <MetricCard
                label="Total grid"
                value={result.total_grid_kwh.toFixed(2)}
                unit="kWh"
                icon={<Glyph name="grid" size={14} />}
                tone="brand"
              />
              <MetricCard
                label="Total cost"
                value={result.total_cost_bdt.toFixed(2)}
                unit="BDT"
                icon={<Glyph name="coin" size={14} />}
                tone="warn"
              />
              <MetricCard
                label="Peak grid"
                value={result.peak_grid_kwh.toFixed(2)}
                unit="kWh"
                icon={<Glyph name="gauge" size={14} />}
                tone="crit"
              />
              <MetricCard
                label="Solar utilized"
                value={result.hourly_plan.reduce((s, p) => s + p.solar_used_kwh, 0).toFixed(2)}
                unit="kWh"
                icon={<Glyph name="sun" size={14} />}
                tone="ok"
              />
              <MetricCard
                label="Battery end"
                value={result.hourly_plan[result.hourly_plan.length - 1]?.battery_energy_after_kwh.toFixed(2) ?? "-"}
                unit="kWh"
                icon={<Glyph name="battery" size={14} />}
              />
              <MetricCard
                label="Validation"
                value={result.validation_status.toUpperCase()}
                icon={<Glyph name="shield" size={14} />}
                tone={result.validation_status === "passed" ? "ok" : "crit"}
              />
            </MetricGrid>
          </section>

          <SectionCard
            title="Directive Interpretation"
            subtitle="Structured adjustments derived from operator notes."
            icon={<Glyph name="spark" size={14} />}
          >
            <DirectivesGrid directives={result.directive_interpretation} />
          </SectionCard>

          <SectionCard
            title="24-hour Dispatch"
            subtitle="Stacked source allocation, battery state-of-charge, and tariff overlay."
            icon={<Glyph name="activity" size={14} />}
          >
            <PlanChart plan={result.hourly_plan} hourly={hourly} />
          </SectionCard>

          <SectionCard
            title="Hourly Plan"
            subtitle="Detailed hour-by-hour allocation."
            icon={<Glyph name="list" size={14} />}
            bodyClassName="p-0"
          >
            <div className="p-3">
              <HourlyPlanTable plan={result.hourly_plan} hourly={hourly} />
            </div>
          </SectionCard>

          <SectionCard
            title="Plan Summary"
            subtitle="Executive overview of the optimized 24-hour dispatch."
            icon={<Glyph name="doc" size={14} />}
          >
            <p className="text-[13px] leading-relaxed text-ink-700">{result.plan_summary}</p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
