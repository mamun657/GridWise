import { useEffect, useMemo, useState } from "react";
import { useOptimization } from "../hooks/useOptimization";
import { api } from "../services/api";
import { defaultBattery, defaultHourlyProfile } from "../utils/hourly";
import type { HourlyRecord, SampleCase } from "../types";
import { AlertCard } from "../components/ui/AlertCard";
import { Glyph } from "../components/ui/Icon";
import {
  PageHeader,
  SectionCard,
} from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard, MetricGrid } from "../components/ui/MetricCard";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SampleCaseCard } from "../components/ui/SampleCaseCard";
import { DirectivesGrid } from "../components/ui/DirectiveCard";
import { HourlyPlanTable } from "../components/HourlyPlanTable";
import { PlanChart } from "../components/PlanChart";

function parseError(error: string | null): { code: string; message: string } | null {
  if (!error) return null;
  const idx = error.indexOf(":");
  if (idx < 0) return { code: "ERROR", message: error };
  return { code: error.slice(0, idx).trim(), message: error.slice(idx + 1).trim() };
}

export function SampleCasesPage() {
  const [cases, setCases] = useState<SampleCase[]>([]);
  const [hourly, setHourly] = useState<HourlyRecord[]>(defaultHourlyProfile());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [battery] = useState(defaultBattery());

  const { loading, result, error, processingMs, optimize } = useOptimization();

  useEffect(() => {
    api
      .sampleCases()
      .then((r) => {
        if (Array.isArray(r.cases)) {
          setCases(r.cases);
          if (r.cases.length > 0) setSelectedId(r.cases[0].scenario_id);
          if (Array.isArray(r.hourly) && r.hourly.length === 24) setHourly(r.hourly);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingCases(false));
  }, []);

  const selected = useMemo(
    () => cases.find((c) => c.scenario_id === selectedId) ?? null,
    [cases, selectedId],
  );

  const runScenario = (c: SampleCase) => {
    setSelectedId(c.scenario_id);
    optimize(c.scenario_id, c.operator_notes, hourly, battery);
  };

  const err = parseError(error);
  const isInfeasible = err?.code === "OPTIMIZATION_FAILED";
  const isGroqFailed = err?.code === "LLM_INTERPRETATION_FAILED";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Public Sample Cases"
        description="Curated scenarios that exercise directive interpretation, battery constraints, and tariff windows. Run any case to validate the solver end-to-end."
      />

      <SectionCard
        title="Scenarios"
        subtitle="Pick a scenario and run the solver to see directives, plan, and totals."
        icon={<Glyph name="list" size={14} />}
        bodyClassName="p-0"
      >
        {loadingCases ? (
          <div className="flex items-center gap-3 px-4 py-6 text-[12.5px] text-ink-500">
            <Spinner size={14} className="text-brand-600" />
            Loading scenarios from server...
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            icon={<Glyph name="list" size={16} />}
            title="No scenarios available"
            description="Backend reachable but no sample cases were returned."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {cases.map((c) => (
              <SampleCaseCard
                key={c.scenario_id}
                sample={c}
                running={loading && selectedId === c.scenario_id}
                status={
                  selectedId === c.scenario_id
                    ? result
                      ? result.validation_status === "passed"
                        ? { tone: "ok", label: "Passed" }
                        : { tone: "crit", label: "Failed" }
                      : null
                    : null
                }
                onRun={() => runScenario(c)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {selected && (
        <SectionCard
          title={`Scenario: ${selected.scenario_id}`}
          subtitle={selected.description}
          icon={<Glyph name="doc" size={14} />}
        >
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ink-700">{selected.description}</p>
            <div className="gw-divider" />
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Operator Notes</h3>
            <DirectivesGrid
              directives={(result && selectedId === selected.scenario_id
                ? result.directive_interpretation
                : selected.operator_notes.map((n, i) => ({
                    note_index: i,
                    applies: true,
                    directive_type: "no_op" as const,
                    structured_adjustment: null,
                    explanation: n,
                  })))
              }
            />
          </div>
        </SectionCard>
      )}

      {loading && (
        <div className="flex items-center gap-3 rounded-md bg-canvas-muted/60 px-4 py-4 text-[12.5px] text-ink-500">
          <Spinner size={14} className="text-brand-600" />
          Running solver for {selectedId}...
        </div>
      )}

      {error && isInfeasible && (
        <AlertCard
          tone="crit"
          title="Infeasible scenario"
          description="The solver could not satisfy every constraint for this scenario. Try a different case or relax the directives."
        />
      )}
      {error && !isInfeasible && (
        <AlertCard
          tone={isGroqFailed ? "warn" : "crit"}
          title={isGroqFailed ? "Directive interpretation failed" : "Optimization error"}
          description={err?.message ?? error}
        />
      )}

      {result && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">Run Results</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-500">
                  Computed in {processingMs} ms - Validation {result.validation_status.toUpperCase()}
                </p>
              </div>
              <StatusBadge
                tone={result.validation_status === "passed" ? "ok" : "crit"}
                label="Validation"
                detail={result.validation_status.toUpperCase()}
              />
            </div>
            <MetricGrid>
              <MetricCard label="Total grid" value={result.total_grid_kwh.toFixed(2)} unit="kWh" icon={<Glyph name="grid" size={14} />} tone="brand" />
              <MetricCard label="Total cost" value={result.total_cost_bdt.toFixed(2)} unit="BDT" icon={<Glyph name="coin" size={14} />} tone="warn" />
              <MetricCard label="Peak grid" value={result.peak_grid_kwh.toFixed(2)} unit="kWh" icon={<Glyph name="gauge" size={14} />} tone="crit" />
              <MetricCard label="Solar used" value={result.hourly_plan.reduce((s, p) => s + p.solar_used_kwh, 0).toFixed(2)} unit="kWh" icon={<Glyph name="sun" size={14} />} tone="ok" />
            </MetricGrid>
          </section>

          <SectionCard
            title="24-hour Dispatch"
            subtitle="Stacked source allocation and battery state-of-charge."
            icon={<Glyph name="activity" size={14} />}
          >
            <PlanChart plan={result.hourly_plan} hourly={hourly} />
          </SectionCard>

          <SectionCard
            title="Hourly Plan"
            subtitle="Hour-by-hour dispatch table."
            icon={<Glyph name="list" size={14} />}
            bodyClassName="p-0"
          >
            <div className="p-3">
              <HourlyPlanTable plan={result.hourly_plan} hourly={hourly} />
            </div>
          </SectionCard>

          <SectionCard
            title="Plan Summary"
            subtitle="Executive overview."
            icon={<Glyph name="doc" size={14} />}
          >
            <p className="text-[13px] leading-relaxed text-ink-700">{result.plan_summary}</p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

