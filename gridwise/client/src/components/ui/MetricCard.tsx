import { Glyph } from "./Icon";

export function MetricCard({
  label,
  value,
  unit,
  icon,
  tone = "neutral",
  meta,
  footnote,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "crit" | "brand";
  meta?: string;
  footnote?: string;
}) {
  const accent =
    tone === "brand"
      ? "bg-brand-50 text-brand-700"
      : tone === "ok"
        ? "bg-ok-50 text-ok-700"
        : tone === "warn"
          ? "bg-warn-50 text-warn-700"
          : tone === "crit"
            ? "bg-crit-50 text-crit-700"
            : "bg-canvas-muted text-ink-500";
  return (
    <div className="gw-card gw-card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="gw-label">{label}</div>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${accent}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[22px] font-semibold tracking-tight text-ink-900 gw-tabnum">
          {value}
        </span>
        {unit && (
          <span className="text-[12px] font-medium text-ink-400">{unit}</span>
        )}
      </div>
      {(meta || footnote) && (
        <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-ink-400">
          {meta && <span>{meta}</span>}
          {meta && footnote && <span className="text-ink-200">·</span>}
          {footnote && <span>{footnote}</span>}
        </div>
      )}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="gw-card p-4">
      <div className="h-3 w-20 rounded bg-canvas-muted animate-pulse" />
      <div className="mt-3 h-6 w-28 rounded bg-canvas-muted animate-pulse" />
      <div className="mt-2 h-3 w-16 rounded bg-canvas-muted animate-pulse" />
    </div>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {children}
    </div>
  );
}

export function IconFor(name: "bolt" | "grid" | "sun" | "battery" | "coin" | "gauge" | "shield" | "flask") {
  return <Glyph name={name} size={14} />;
}
