import { Glyph } from "./Icon";

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`gw-card ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-canvas-border px-5 py-4">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
              {icon}
            </span>
          )}
          <div>
            <h2 className="gw-h2 leading-tight">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function PanelTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        {children}
      </h3>
      {hint && <span className="text-[11.5px] text-ink-400">{hint}</span>}
    </div>
  );
}

export function InlineRow({
  label,
  value,
  unit,
  align = "between",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  align?: "between" | "right";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[12.5px] text-ink-500">{label}</span>
      <span className="text-[13px] font-semibold text-ink-900 gw-tabnum">
        {value}
        {unit && <span className="ml-1 text-[11.5px] font-normal text-ink-400">{unit}</span>}
      </span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">
            <Glyph name="spark" size={11} /> {eyebrow}
          </div>
        )}
        <h1 className="gw-h1">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
