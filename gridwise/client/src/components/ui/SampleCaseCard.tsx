import { Glyph } from "./Icon";
import { Spinner } from "./Spinner";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import type { SampleCase } from "../../types";

function shortId(s: string) {
  const m = s.match(/GW-PUB-(\d{3})/);
  return m ? `GW-PUB-${m[1]}` : s;
}

export function SampleCaseCard({
  sample,
  running,
  status,
  onRun,
}: {
  sample: SampleCase;
  running: boolean;
  status: { tone: StatusTone; label: string } | null;
  onRun: () => void;
}) {
  const notes = sample.operator_notes.length;
  const description = sample.description || "Public sample scenario.";
  return (
    <article className="gw-card gw-card-hover flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-sm bg-canvas-muted px-2 font-mono text-[11px] font-semibold tracking-tight text-ink-700 ring-1 ring-canvas-border">
              {shortId(sample.scenario_id)}
            </span>
            {status && <StatusBadge tone={status.tone} label={status.label} />}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-ink-900">
            {humanize(sample.scenario_id)}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-500">{description}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-canvas-border pt-3 text-[12px]">
        <Stat label="Notes" value={`${notes}`} sub={notes === 1 ? "directive" : "directives"} />
        <Stat
          label="Battery"
          value={`${sample.battery.capacity_kwh}`}
          sub="kWh capacity"
        />
        <Stat
          label="Initial"
          value={`${sample.battery.initial_energy_kwh}`}
          sub="kWh stored"
        />
        <Stat
          label="C-rate"
          value={`±${sample.battery.max_charge_kwh_per_hour}`}
          sub={`kWh/h charge · discharge`}
        />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
          <Glyph name="flask" size={12} />
          {notes === 0 ? "No operator notes" : `${notes} operator note${notes === 1 ? "" : "s"}`}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="gw-btn-primary"
          aria-label={`Run ${shortId(sample.scenario_id)}`}
        >
          {running ? <Spinner size={14} /> : <Glyph name="play" size={13} />}
          {running ? "Running…" : "Run scenario"}
        </button>
      </div>
    </article>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="gw-label">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[14px] font-semibold tracking-tight text-ink-900 gw-tabnum">{value}</span>
        {sub && <span className="text-[11px] text-ink-400">{sub}</span>}
      </dd>
    </div>
  );
}

function humanize(s: string) {
  return s
    .replace(/^GW-PUB-\d{3}-?/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Sample scenario";
}
