import { API_BASE_URL } from "../../services/api";

import { Glyph } from "./Icon";
import { StatusBadge, type StatusTone } from "./StatusBadge";

export type SidebarRoute = "overview" | "optimize" | "samples" | "dispatch" | "api" | "status";

export type ServiceHealth = {
  api: boolean;
  groq: boolean;
  mongo: boolean;
  mongoDetail?: string;
};

const items: { id: SidebarRoute; label: string; icon: React.ReactNode; external?: boolean; href?: string }[] = [
  { id: "overview", label: "Overview", icon: <Glyph name="overview" size={16} /> },
  { id: "optimize", label: "Optimize", icon: <Glyph name="bolt" size={16} /> },
  { id: "samples", label: "Sample cases", icon: <Glyph name="flask" size={16} /> },
  { id: "dispatch", label: "Dispatch", icon: <Glyph name="activity" size={16} /> },
  { id: "api", label: "API documentation", icon: <Glyph name="doc" size={16} />, external: true, href: `${API_BASE_URL}/docs` },
  { id: "status", label: "System status", icon: <Glyph name="server" size={16} /> },
];

export function Sidebar({
  active,
  onNavigate,
  health,
  onClose,
  version = "v1.0.0",
}: {
  active: SidebarRoute;
  onNavigate: (r: SidebarRoute) => void;
  health: ServiceHealth | null;
  onClose?: () => void;
  version?: string;
}) {
  return (
    <aside className="flex h-full w-full flex-col bg-canvas text-ink-900 lg:w-[244px]">
      <div className="flex items-center justify-between border-b border-canvas-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
            <Glyph name="grid" size={18} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ok-500 ring-2 ring-canvas" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">GridWise</div>
            <div className="text-[10.5px] text-ink-400">Smart campus energy optimizer</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 hover:bg-canvas-muted hover:text-ink-900 lg:hidden"
            aria-label="Close navigation"
          >
            <Glyph name="close" size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
        <div className="px-2 pb-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-300">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {items.map((it) => {
            const isActive = !it.external && it.id === active;
            if (it.external) {
              return (
                <li key={it.id}>
                  <a
                    href={it.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-ink-500 transition-colors hover:bg-canvas-muted hover:text-ink-900"
                  >
                    <span className="text-ink-400 group-hover:text-ink-700">{it.icon}</span>
                    <span className="flex-1">{it.label}</span>
                    <Glyph name="external" size={12} className="text-ink-300" />
                  </a>
                </li>
              );
            }
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(it.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-180 ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-500 hover:bg-canvas-muted hover:text-ink-900"
                  }`}
                >
                  <span
                    className={`${
                      isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-700"
                    }`}
                  >
                    {it.icon}
                  </span>
                  <span className="flex-1">{it.label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-canvas-border px-3 py-3">
        <div className="gw-label mb-2 px-1">System health</div>
        <div className="space-y-1.5">
          <SideStatus
            tone={health ? (health.api ? "ok" : "crit") : "neutral"}
            label="API"
            detail={health ? (health.api ? "Operational" : "Down") : "Checking"}
          />
          <SideStatus
            tone={health ? (health.groq ? "ok" : "warn") : "neutral"}
            label="Groq"
            detail={health ? (health.groq ? "Configured" : "Unavailable") : "—"}
          />
          <SideStatus
            tone={health ? (health.mongo ? "ok" : "crit") : "neutral"}
            label="MongoDB"
            detail={health ? (health.mongo ? "Connected" : health.mongoDetail ?? "Unavailable") : "—"}
          />
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-[10.5px] text-ink-300">
          <span>{version}</span>
          <span className="rounded-sm bg-canvas-muted px-1.5 py-0.5 font-mono text-[10px] tracking-tight">
            dev
          </span>
        </div>
      </div>
    </aside>
  );
}

function SideStatus({
  tone,
  label,
  detail,
}: {
  tone: StatusTone;
  label: string;
  detail: string;
}) {
  return (
    <StatusBadge tone={tone} label={label} detail={detail} />
  );
}
