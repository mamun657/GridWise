type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const currentLevel = (process.env.LOG_LEVEL as Level) || "info";
const threshold = LEVELS[currentLevel] ?? LEVELS.info;

const maskSecret = (s: string | undefined): string => {
  if (!s) return "<unset>";
  if (s.length <= 6) return "***";
  return `${s.slice(0, 3)}***${s.slice(-3)}`;
};

const safeStringify = (meta: Record<string, unknown> | undefined): string => {
  if (!meta) return "";
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (
      lower.includes("key") ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("mongodb_uri") ||
      lower.includes("uri") ||
      lower === "authorization"
    ) {
      sanitized[k] = maskSecret(typeof v === "string" ? v : undefined);
      continue;
    }
    sanitized[k] = v;
  }
  try {
    return JSON.stringify(sanitized);
  } catch {
    return "";
  }
};

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (threshold <= LEVELS.debug) {
      console.log(`[debug] ${msg} ${safeStringify(meta)}`);
    }
  },
  info(msg: string, meta?: Record<string, unknown>) {
    if (threshold <= LEVELS.info) {
      console.log(`[info] ${msg} ${safeStringify(meta)}`);
    }
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    if (threshold <= LEVELS.warn) {
      console.warn(`[warn] ${msg} ${safeStringify(meta)}`);
    }
  },
  error(msg: string, meta?: Record<string, unknown>) {
    if (threshold <= LEVELS.error) {
      console.error(`[error] ${msg} ${safeStringify(meta)}`);
    }
  },
};
