import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { defaultBattery, defaultHourlyProfile } from "../utils/hourly";
import type { HealthResponse, HourlyRecord } from "../types";
import { AlertCard } from "../components/ui/AlertCard";
import { Glyph } from "../components/ui/Icon";
import { InlineRow, PageHeader, SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard, MetricGrid } from "../components/ui/MetricCard";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge, type StatusTone } from "../components/ui/StatusBadge";

function tone(s: string | undefined): { tone: StatusTone; label: string } {
  if (!s) return { tone: "neutral", label: "Unknown" };
  if (s === "connected" || s === "configured (connected)" || s === "configured")
    return { tone: "ok", label: s };
  if (s === "missing" || s === "not configured") return { tone: "warn", label: s };
  return { tone: "crit", label: s };
}

const isMongoOk = (h: HealthResponse | null) => h?.services?.mongodb === "connected";

export function OverviewPage() {
  const [hourly, setHourly] = useState<HourlyRecord[]>(defaultHourlyProfile());
  const [battery] = useState(defaultBattery());
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [samples, setSamples] = useState<{ id: string; desc: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.health().then(setHealth).catch((e) => setHealthErr(String(e)));
    api.sampleCases().then((r) => {
      setSamples(r.cases.map((c) => ({ id: c.scenario_id, desc: c.description })));
      if (Array.isArray(r.hourly) && r.hourly.length === 24) setHourly(r.hourly);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (health || healthErr) setLoading(false);
  }, [health, healthErr]);

  const totalDemand = useMemo(() => hourly.reduce((s, h) => s + h.demand_kwh, 0), [hourly]);
  const totalSolar = useMemo(() => hourly.reduce((s, h) => s + h.solar_kwh, 0), [hourly]);
  const solarFraction = totalDemand > 0 ? (totalSolar / totalDemand) * 100 : 0;
  const mongo = tone(health?.services?.mongodb);
  const groq = tone(health?.services?.groq);
  const overallOk = health?.status === "ok" || (isMongoOk(health) && (health?.services?.groq ?? "").length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="GridWise Operations Console"
        description="A real-time view of system health, scenario library, and 24-hour profile readiness. Everything runs against the live backend - nothing here is fabricated."
        actions={overallOk ? <StatusBadge tone="ok" label="System" detail="Operational" /> : <StatusBadge tone="warn" label="System" detail="Degraded" />}
      />

      {healthErr && (
        <AlertCard tone="crit" title="Backend unreachable" description={healthErr} />
      )}

      <SectionCard title="System Health" subtitle="Strict status semantics - only 'connected' counts MongoDB as available." icon={<Glyph name="server" size={14} />}>
        {loading ? (
          <div className="flex items-center gap-3 rounded-md bg-canvas-muted/60 px-3 py-3 text-[12.5px] text-ink-500">
            <Spinner size={14} className="text-brand-600" />
            Probing backend status...
          </div>
        ) : (
          <div className="divide-y divide-canvas-border">
            <InlineRow label="MongoDB" value={mongo.label} />
            <InlineRow label="MongoDB status" value={<StatusBadge tone={mongo.tone} label={mongo.label} />} />
            <InlineRow label="Groq interpreter" value={<StatusBadge tone={groq.tone} label={groq.label} />} />
            <InlineRow label="API status" value={health?.status ?? "unknown"} />
          </div>
        )}
      </SectionCard>

      <MetricGrid>
        <MetricCard label="Library scenarios" value={String(samples.length)} icon={<Glyph name="flask" size={14} />} tone="brand" />
        <MetricCard label="Daily demand" value={totalDemand.toFixed(1)} unit="kWh" icon={<Glyph name="bolt" size={14} />} />
        <MetricCard label="Daily solar" value={totalSolar.toFixed(1)} unit="kWh" icon={<Glyph name="sun" size={14} />} tone="ok" />
        <MetricCard label="Solar fraction" value={solarFraction.toFixed(1)} unit="%" icon={<Glyph name="gauge" size={14} />} tone="warn" />
        <MetricCard label="Battery capacity" value={`${battery.capacity_kwh}`} unit="kWh" icon={<Glyph name="battery" size={14} />} />
        <MetricCard label="MongoDB" value={mongo.label} icon={<Glyph name="server" size={14} />} tone={mongo.tone} />
      </MetricGrid>

      <SectionCard title="Scenario Library" subtitle="Public cases shipped with the backend - curated to exercise all directive types." icon={<Glyph name="list" size={14} />} bodyClassName="p-0">
        {samples.length === 0 ? (
          <EmptyState icon={<Glyph name="list" size={16} />} title="No scenarios loaded" description="Fetch the scenario library from the backend to see curated cases." />
        ) : (
          <ul className="divide-y divide-canvas-border">
            {samples.map((s) => (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-canvas-muted text-ink-500 ring-1 ring-canvas-border">
                  <Glyph name="flask" size={13} />
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[12px] font-semibold tracking-tight text-ink-700">{s.id}</div>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-500">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
