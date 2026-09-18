import { useCallback, useState } from "react";
import { api } from "../services/api";
import type { BatteryParams, HourlyRecord, OptimizeResponse } from "../types";

export interface OptimizationState {
  loading: boolean;
  result: OptimizeResponse | null;
  error: string | null;
  processingMs: number | null;
}

const initial: OptimizationState = { loading: false, result: null, error: null, processingMs: null };

export function useOptimization() {
  const [state, setState] = useState<OptimizationState>(initial);

  const optimize = useCallback(
    async (scenario_id: string, operator_notes: string[], hourly: HourlyRecord[], battery: BatteryParams) => {
      setState({ loading: true, result: null, error: null, processingMs: null });
      const t0 = performance.now();
      try {
        const result = await api.optimize({ scenario_id, operator_notes, hourly, battery });
        setState({ loading: false, result, error: null, processingMs: Math.round(performance.now() - t0) });
      } catch (e) {
        setState({ loading: false, result: null, error: e instanceof Error ? e.message : String(e), processingMs: Math.round(performance.now() - t0) });
      }
    },
    [],
  );

  const reset = useCallback(() => setState(initial), []);
  return { ...state, optimize, reset };
}
