import type {
  BatteryParams,
  HourlyRecord,
  OptimizeResponse,
  SampleCasesResponse,
  HealthResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const err = (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>))
      ? (parsed as { error: { code?: string; message?: string } }).error
      : { code: "HTTP_ERROR", message: `status ${res.status}` };
    throw new Error(`${err.code ?? "HTTP_ERROR"}: ${err.message ?? res.statusText}`);
  }
  return parsed as T;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  sampleCases: () => request<SampleCasesResponse>("/sample-cases"),
  optimize: (body: {
    scenario_id: string;
    operator_notes: string[];
    hourly: HourlyRecord[];
    battery: BatteryParams;
  }) =>
    request<OptimizeResponse>("/optimize-energy", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
