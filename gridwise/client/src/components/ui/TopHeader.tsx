import { Glyph } from "./Icon";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import type { SidebarRoute } from "./Sidebar";

const titleFor: Record<SidebarRoute, string> = {
  overview: "Energy Operations Overview",
  optimize: "Interactive Optimization",
  samples: "Public Sample Cases",
  dispatch: "24-hour Dispatch",
  api: "API Documentation",
  status: "System Status",
};

const descFor: Record<SidebarRoute, string> = {
  overview:
    "Monitor campus demand, renewable utilization, battery state, and optimization performance.",
  optimize:
    "Use natural-language operator instructions. GridWise interprets directives with Groq and computes a constraint-valid 24-hour dispatch.",
  samples:
    "Predefined operator scenarios shipped from public-sample-cases. Run uses the official 24-hour profile.",
  dispatch:
    "Visualize the optimized 24-hour solar, grid and battery allocation with tariff and state-of-charge overlays.",
  api:
    "OpenAPI reference served at /docs. Health, optimization and sample-case endpoints available.",
  status:
    "Live service states from /health. MongoDB, Groq and API connectivity are surfaced from real runtime.",
};

export type HeaderHealth = {
  api: boolean;
  groq: boolean;
  mongo: boolean;
  mongoDetail?: string;
};

export function TopHeader({
  route,
  onToggleNav,
  health,
}: {
  route: SidebarRoute;
  onToggleNav: () => void;
  health: HeaderHealth | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-canvas-border bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleNav}
            className="mt-0.5 rounded-md p-1.5 text-ink-500 hover:bg-canvas-muted hover:text-ink-900 lg:hidden"
            aria-label="Open navigation"
          >
            <Glyph name="menu" size={18} />
          </button>
          <div>
            <h1 className="gw-h1">{titleFor[route]}</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-ink-500">{descFor[route]}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {health ? (
            <>
              <StatusBadge
                tone={health.api ? "ok" : "crit"}
                label="API"
                detail={health.api ? "Operational" : "Down"}
              />
              <StatusBadge
                tone={health.groq ? "ok" : "warn"}
                label="Groq"
                detail={health.groq ? "Configured" : "Unavailable"}
              />
              <StatusBadge
                tone={health.mongo ? "ok" : "crit"}
                label="MongoDB"
                detail={health.mongo ? "Connected" : health.mongoDetail ?? "Unavailable"}
              />
            </>
          ) : (
            <StatusBadge tone="neutral" label="Health" detail="Checking…" />
          )}
        </div>
      </div>
    </header>
  );
}
