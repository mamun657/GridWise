export const isFiniteNumber = (v: unknown): v is number => {
  return typeof v === "number" && Number.isFinite(v) && !Number.isNaN(v);
};

export const round = (v: number, digits = 4): number => {
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
};

export const clamp = (v: number, lo: number, hi: number): number => {
  return Math.min(Math.max(v, lo), hi);
};

export const NUMERIC_TOLERANCE = 1e-3;
