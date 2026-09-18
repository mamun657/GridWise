import { useEffect, useState } from "react";
import { Sidebar, type SidebarRoute, type ServiceHealth } from "./Sidebar";
import { TopHeader } from "./TopHeader";

export function AppShell({
  route,
  onRoute,
  children,
  health,
}: {
  route: SidebarRoute;
  onRoute: (r: SidebarRoute) => void;
  children: React.ReactNode;
  health: ServiceHealth | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [route]);

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-3 py-6 sm:px-5 lg:py-8">
        <div className="hidden shrink-0 lg:block">
          <div className="sticky top-6 h-[calc(100vh-48px)] overflow-hidden rounded-xl border border-canvas-border bg-canvas shadow-env">
            <Sidebar active={route} onNavigate={onRoute} health={health} />
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-env-900/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-canvas shadow-pop">
              <Sidebar
                active={route}
                onNavigate={onRoute}
                health={health}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-hidden rounded-xl border border-canvas-border bg-canvas shadow-env">
          <TopHeader
            route={route}
            onToggleNav={() => setMobileOpen((v) => !v)}
            health={health}
          />
          <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
