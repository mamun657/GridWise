import { Glyph } from "./Icon";

type Tone = "info" | "warn" | "crit" | "ok";

const tones: Record<Tone, { wrap: string; icon: string; title: string }> = {
  info: {
    wrap: "bg-brand-50 border-brand-100 text-brand-700",
    icon: "text-brand-600",
    title: "text-brand-700",
  },
  warn: {
    wrap: "bg-warn-50 border-warn-100 text-warn-700",
    icon: "text-warn-600",
    title: "text-warn-700",
  },
  crit: {
    wrap: "bg-crit-50 border-crit-100 text-crit-700",
    icon: "text-crit-600",
    title: "text-crit-700",
  },
  ok: {
    wrap: "bg-ok-50 border-ok-100 text-ok-700",
    icon: "text-ok-600",
    title: "text-ok-700",
  },
};

const iconFor: Record<Tone, React.ReactNode> = {
  info: <Glyph name="spark" size={16} />,
  warn: <Glyph name="warn" size={16} />,
  crit: <Glyph name="x" size={16} />,
  ok: <Glyph name="check" size={16} />,
};

export function AlertCard({
  tone,
  title,
  description,
  action,
}: {
  tone: Tone;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className={`flex items-start gap-3 rounded-md border p-3.5 ${t.wrap}`} role="alert">
      <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-canvas ${t.icon}`}>
        {iconFor[tone]}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-semibold tracking-tight ${t.title}`}>{title}</div>
        {description && (
          <div className="mt-0.5 text-[12.5px] leading-relaxed opacity-90">{description}</div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
