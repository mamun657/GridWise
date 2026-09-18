import type {
  BatteryParams,
  HourlyRecord,
  OptimizeResponse,
  SampleCasesResponse,
  HealthResponse,
} from "../types";

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL = normalizeBaseUrl(
  configuredBaseUrl || (import.meta.env.DEV ? "http://localhost:4000" : ""),
);

export class ApiError extends Error {
  readonly status: number | null;
  readonly kind: "configuration" | "network" | "timeout" | "http";

  constructor(
    message: string,
    kind: "configuration" | "network" | "timeout" | "http",
    status: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "API_CONFIG_MISSING: set VITE_API_URL in the production frontend environment.",
      "configuration",
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`API_TIMEOUT: request timed out for ${path}`, "timeout");
    }
    throw new ApiError(
      `BACKEND_UNAVAILABLE: ${error instanceof Error ? error.message : "network request failed"}`,
      "network",
    );
  } finally {
    window.clearTimeout(timeout);
  }

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
      : { code: `HTTP_${res.status}`, message: res.statusText || `status ${res.status}` };
    throw new ApiError(
      `HTTP_${res.status}: ${err.code ?? "HTTP_ERROR"}: ${err.message ?? res.statusText}`,
      "http",
      res.status,
    );
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
