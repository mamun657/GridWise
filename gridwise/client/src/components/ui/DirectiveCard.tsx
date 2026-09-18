import { Glyph } from "./Icon";
import type { DirectiveInterpretation, DirectiveType } from "../../types";

type IconName = "sun" | "battery" | "gauge" | "list";

const labels: Record<DirectiveType, string> = {
  solar_reduction: "Solar reduction",
  minimum_battery_reserve: "Battery reserve",
  no_charge_window: "No-charge window",
  no_discharge_window: "No-discharge window",
  max_grid_window: "Grid cap",
  no_op: "No operation",
};

const accents: Record<DirectiveType, { icon: IconName; pill: string; tone: string }> = {
  solar_reduction: { icon: "sun", pill: "bg-warn-50 text-warn-700 border-warn-100", tone: "text-warn-600" },
  minimum_battery_reserve: { icon: "battery", pill: "bg-ok-50 text-ok-700 border-ok-100", tone: "text-ok-600" },
  no_charge_window: { icon: "battery", pill: "bg-crit-50 text-crit-700 border-crit-100", tone: "text-crit-600" },
  no_discharge_window: { icon: "battery", pill: "bg-crit-50 text-crit-700 border-crit-100", tone: "text-crit-600" },
  max_grid_window: { icon: "gauge", pill: "bg-brand-50 text-brand-700 border-brand-100", tone: "text-brand-600" },
  no_op: { icon: "list", pill: "bg-canvas-muted text-ink-500 border-canvas-border", tone: "text-ink-400" },
};

function fmtHours(hours?: number[]): string {
  if (!hours || hours.length === 0) return "—";
  const fmt = (h: number) => `${h.toString().padStart(2, "0")}:00`;
  const ranges: string[] = [];
  const sorted = [...hours].sort((a, b) => a - b);
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const h = sorted[i];
    if (h === prev + 1) {
      prev = h;
      continue;
    }
    ranges.push(start === prev ? fmt(start) : `${fmt(start)}–${fmt(prev)}`);
    start = h;
    prev = h;
  }
  return ranges.join(" · ");
}

function fmtValue(d: DirectiveInterpretation): React.ReactNode {
  if (!d.applies || !d.structured_adjustment) return null;
  const a = d.structured_adjustment;
  switch (d.directive_type) {
    case "solar_reduction":
      return `${Math.round((a.factor ?? 0) * 100)}% remaining`;
    case "minimum_battery_reserve":
      return a.is_percentage
        ? `${a.percentage ?? 0}% (${a.reserve_kwh ?? 0} kWh)`
        : `${a.reserve_kwh ?? 0} kWh`;
    case "max_grid_window":
      return `Cap ${a.grid_cap_kwh ?? 0} kWh`;
    case "no_charge_window":
    case "no_discharge_window":
      return "Restricted window";
    default:
      return null;
  }
}

export function DirectiveCard({ d, index }: { d: DirectiveInterpretation; index: number }) {
  const accent = accents[d.directive_type] ?? accents.no_op;
  return (
    <article className="gw-card gw-card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-canvas-muted text-ink-500 ring-1 ring-canvas-border">
            <Glyph name={accent.icon} size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`gw-pill border ${accent.pill}`}
                aria-label={`Directive type ${labels[d.directive_type]}`}
              >
                {labels[d.directive_type]}
              </span>
              <span className="text-[11px] text-ink-300">note {String(index + 1).padStart(2, "0")}</span>
              {!d.applies && (
                <span className="gw-pill bg-canvas-muted text-ink-400 border border-canvas-border">
                  Skipped
                </span>
              )}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
              {d.explanation || labels[d.directive_type]}
            </p>
          </div>
        </div>
      </div>

      {d.applies && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-canvas-border pt-3 sm:grid-cols-2">
          <div>
            <div className="gw-label">Structured value</div>
            <div className={`mt-1 text-[14px] font-semibold tracking-tight ${accent.tone}`}>
              {fmtValue(d)}
            </div>
          </div>
          <div>
            <div className="gw-label">Affected hours</div>
            <div className="mt-1 text-[13px] font-medium text-ink-900 gw-mono">
              {fmtHours(d.structured_adjustment?.hours)}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function DirectivesGrid({ directives }: { directives: DirectiveInterpretation[] }) {
  if (!directives.length) {
    return (
      <p className="gw-muted">No directives interpreted for this scenario.</p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {directives.map((d, i) => (
        <DirectiveCard key={`${d.note_index}-${i}`} d={d} index={d.note_index} />
      ))}
    </div>
  );
}
