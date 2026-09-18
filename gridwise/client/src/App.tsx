import { useEffect, useState } from "react";
import { api } from "./services/api";
import type { HealthResponse } from "./types";
import { AppShell } from "./components/ui/AppShell";
import type { SidebarRoute } from "./components/ui/Sidebar";
import type { ServiceHealth } from "./components/ui/Sidebar";
import { OverviewPage } from "./pages/OverviewPage";
import { OptimizePage } from "./pages/OptimizePage";
import { SampleCasesPage } from "./pages/SampleCasesPage";
import { DispatchPage } from "./pages/DispatchPage";
import { StatusPage } from "./pages/StatusPage";
import { ApiDocsPage } from "./pages/ApiDocsPage";

const normalizeHealth = (h: HealthResponse | null): ServiceHealth | null => {
  if (!h) return null;
  const groq = h.services?.groq ?? "";
  const mongo = h.services?.mongodb ?? "";
  const groqOk = groq === "configured" || groq === "configured (connected)" || groq === "connected";
  return {
    api: h.status === "ok",
    groq: groqOk,
    mongo: mongo === "connected",
    mongoDetail: mongo,
  };
};

export default function App() {
  const [route, setRoute] = useState<SidebarRoute>("overview");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined);
  }, []);

  return (
    <AppShell route={route} onRoute={setRoute} health={normalizeHealth(health)}>
      {route === "overview" && <OverviewPage />}
      {route === "optimize" && <OptimizePage />}
      {route === "samples" && <SampleCasesPage />}
      {route === "dispatch" && <DispatchPage />}
      {route === "api" && <ApiDocsPage />}
      {route === "status" && <StatusPage />}
    </AppShell>
  );
}
