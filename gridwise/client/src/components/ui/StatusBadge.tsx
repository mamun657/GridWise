import { Glyph } from "./Icon";

export type StatusTone = "ok" | "warn" | "crit" | "neutral";

const toneMap: Record<StatusTone, { wrap: string; dot: string; icon: React.ReactNode }> = {
  ok: {
    wrap: "bg-ok-50 text-ok-700 border-ok-100",
    dot: "bg-ok-500",
    icon: <Glyph name="check" size={12} />,
  },
  warn: {
    wrap: "bg-warn-50 text-warn-700 border-warn-100",
    dot: "bg-warn-500",
    icon: <Glyph name="warn" size={12} />,
  },
  crit: {
    wrap: "bg-crit-50 text-crit-700 border-crit-100",
    dot: "bg-crit-500",
    icon: <Glyph name="x" size={12} />,
  },
  neutral: {
    wrap: "bg-canvas-muted text-ink-500 border-canvas-border",
    dot: "bg-ink-300",
    icon: <Glyph name="activity" size={12} />,
  },
};

export function StatusBadge({
  tone,
  label,
  detail,
}: {
  tone: StatusTone;
  label: string;
  detail?: string;
}) {
  const t = toneMap[tone];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${t.wrap}`}
      role="status"
      aria-label={`${label}${detail ? `: ${detail}` : ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
      <span className="font-semibold tracking-tight">{label}</span>
      {detail && <span className="font-normal opacity-80">{detail}</span>}
    </div>
  );
}
