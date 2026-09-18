import { useState } from "react";
import { Glyph } from "./ui/Icon";
import { Spinner } from "./ui/Spinner";

export function OperatorNotesInput({
  notes,
  onChange,
  loading,
  onOptimize,
  onReset,
  processingMs,
}: {
  notes: string[];
  onChange: (next: string[]) => void;
  loading: boolean;
  onOptimize: () => void;
  onReset?: () => void;
  processingMs: number | null;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...notes, value]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(notes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Glyph name="doc" size={14} />
          </span>
          <h3 className="text-[14px] font-semibold tracking-tight text-ink-900">
            Operator Directives
          </h3>
          <span className="gw-pill bg-canvas-muted text-ink-500 border border-canvas-border">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[12.5px] text-ink-500">
          Natural-language operational constraints. Each note is interpreted by Groq into a
          structured directive before the LP solver runs.
        </p>
      </header>

      <div className="rounded-md border border-canvas-border bg-canvas-muted/40 p-3">
        <label htmlFor="gw-note-input" className="gw-label">
          Add operator instruction
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            id="gw-note-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. Solar output drops to 20% from 1 PM to 3 PM"
            className="gw-input flex-1"
            disabled={loading}
            aria-label="New operator instruction"
          />
          <button
            type="button"
            onClick={add}
            disabled={loading || draft.trim().length === 0}
            className="gw-btn-outline"
            aria-label="Add directive"
          >
            <Glyph name="plus" size={13} />
            Add directive
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-md border border-dashed border-canvas-border bg-canvas-muted/30 px-4 py-8 text-center">
          <p className="text-[13px] font-medium text-ink-700">No operator instructions yet</p>
          <p className="mt-1 text-[12px] text-ink-400">
            Add at least one directive to interpret. The cafeteria is open regardless.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {notes.map((n, idx) => (
            <li
              key={`${idx}-${n.slice(0, 8)}`}
              className="group flex items-start gap-3 rounded-md border border-canvas-border bg-canvas p-3 shadow-card transition-shadow duration-180 hover:shadow-cardHover"
            >
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 font-mono text-[12px] font-semibold text-brand-700 ring-1 ring-brand-100 gw-tabnum">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <p className="flex-1 text-[13px] leading-relaxed text-ink-700">{n}</p>
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={loading}
                aria-label={`Remove note ${idx + 1}`}
                className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-400 opacity-0 transition-colors duration-180 hover:bg-crit-50 hover:text-crit-700 focus:opacity-100 group-hover:opacity-100"
              >
                <Glyph name="trash" size={12} />
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-canvas-border pt-4">
        <button
          type="button"
          onClick={onOptimize}
          disabled={loading}
          className="gw-btn-primary"
          aria-label="Optimize plan"
        >
          {loading ? <Spinner size={13} className="text-white" /> : <Glyph name="bolt" size={13} />}
          {loading ? "Optimizing…" : "Optimize plan"}
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="gw-btn-ghost"
            aria-label="Reset to example notes"
          >
            <Glyph name="refresh" size={13} />
            Reset example
          </button>
        )}
        {processingMs !== null && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-ink-400">
            <Glyph name="activity" size={12} />
            processed in {processingMs} ms
          </span>
        )}
      </div>
    </div>
  );
}
