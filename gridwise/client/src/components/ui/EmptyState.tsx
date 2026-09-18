import { Glyph } from "./Icon";

export function EmptyState({
  icon = "list",
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-canvas-border bg-canvas-muted/40 px-6 py-10 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink-400 shadow-card">
        {icon ?? <Glyph name="spark" size={18} />}
      </span>
      <div className="mt-3 text-[14px] font-semibold text-ink-900">{title}</div>
      {description && (
        <div className="mt-1 max-w-sm text-[12.5px] text-ink-500">{description}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
