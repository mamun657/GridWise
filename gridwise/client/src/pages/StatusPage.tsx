import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { HealthResponse } from "../types";
import { AlertCard } from "../components/ui/AlertCard";
import { Glyph } from "../components/ui/Icon";
import { InlineRow, PageHeader, SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge, type StatusTone } from "../components/ui/StatusBadge";

function tone(s: string | undefined): { tone: StatusTone; label: string; ok: boolean } {
  if (!s) return { tone: "neutral", label: "Unknown", ok: false };
  const ok = s === "connected" || s === "configured (connected)" || s === "configured";
  if (ok) return { tone: "ok", label: s, ok: true };
  if (s === "missing" || s === "not configured") return { tone: "warn", label: s, ok: false };
  return { tone: "crit", label: s, ok: false };
}

function errorTitle(message: string): string {
  if (message.startsWith("HTTP_404:")) return "Backend endpoint not found";
  if (message.startsWith("HTTP_")) return "Backend returned an HTTP error";
  if (message.startsWith("API_TIMEOUT:")) return "Backend request timed out";
  if (message.startsWith("API_CONFIG_MISSING:")) return "Backend URL is not configured";
  return "Backend unavailable";
}

export function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const probe = () => {
    setLoading(true);
    setErr(null);
    api.health().then((h) => { setHealth(h); setCheckedAt(new Date().toISOString()); }).catch((e) => setErr(String(e))).finally(() => setLoading(false));
  };

  useEffect(() => { probe(); }, []);

  const mongo = tone(health?.services?.mongodb);
  const groq = tone(health?.services?.groq);
  const overallOk = health?.status === "ok" && mongo.ok && groq.ok;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Status"
        title="System Status"
        description="Live backend probe. Only 'connected' counts as available; 'error', 'missing', or unknown values surface as degraded."
        actions={
          <button type="button" onClick={probe} disabled={loading} className="gw-btn-outline">
            <Glyph name="refresh" size={12} />
            Re-probe
          </button>
        }
      />

      {err && (
        <AlertCard tone="crit" title={errorTitle(err)} description={err} />
      )}

      {!err && (
        <SectionCard title="Backend Probe" subtitle="Direct GET /health - real responses only." icon={<Glyph name="server" size={14} />}>
          {loading ? (
            <div className="flex items-center gap-3 rounded-md bg-canvas-muted/60 px-3 py-3 text-[12.5px] text-ink-500">
              <Spinner size={14} className="text-brand-600" />
              Probing /health...
            </div>
          ) : (
            <div className="divide-y divide-canvas-border">
              <InlineRow label="API status" value={<StatusBadge tone={overallOk ? "ok" : "warn"} label={health?.status ?? "unknown"} />} />
              <InlineRow label="MongoDB" value={<StatusBadge tone={mongo.tone} label={mongo.label} />} />
              <InlineRow label="Groq interpreter" value={<StatusBadge tone={groq.tone} label={groq.label} />} />
              <InlineRow label="Checked at" value={checkedAt ?? "unknown"} />
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Component Semantics" subtitle="How strict status values map to UI badges." icon={<Glyph name="shield" size={14} />}>
        <div className="space-y-2 text-[12.5px] text-ink-700">
          <p><span className="font-mono text-ink-900">connected</span> - service reachable. Shown green (OK).</p>
          <p><span className="font-mono text-ink-900">configured (connected)</span> - Groq-only variant. Shown green (OK).</p>
          <p><span className="font-mono text-ink-900">configured</span> - Groq-only variant (no live probe). Shown green (OK).</p>
          <p><span className="font-mono text-ink-900">missing</span> - service key absent. Shown amber (warn).</p>
          <p><span className="font-mono text-ink-900">not configured</span> - service disabled. Shown amber (warn).</p>
          <p><span className="font-mono text-ink-900">error</span> / any other value - shown red (crit).</p>
        </div>
      </SectionCard>
    </div>
  );
}
