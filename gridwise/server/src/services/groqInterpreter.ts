import { request } from "undici";
import { config, isGroqConfigured } from "../config";
import { logger } from "../utils/logger";
import {
  DIRECTIVE_TYPES,
  DirectiveInterpretation,
  directiveListSchema,
  directiveTypeAdjustmentHint,
  StructuredAdjustment,
} from "../schemas/directive";
import { AppError } from "../utils/errors";

const stripJsonWrappers = (raw: string): string => {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "");
    s = s.replace(/```\s*$/, "");
  }
  const firstBrace = s.indexOf("{");
  const firstBracket = s.indexOf("[");
  const startCandidates = [firstBrace, firstBracket].filter((v) => v >= 0);
  if (startCandidates.length > 0) {
    const start = Math.min(...startCandidates);
    s = s.slice(start);
  }
  const lastSquare = s.lastIndexOf("]");
  const lastCurly = s.lastIndexOf("}");
  const end = Math.max(lastSquare, lastCurly);
  if (end >= 0) {
    s = s.slice(0, end + 1);
  }
  return s.trim();
};

const buildSystemPrompt = (): string => {
  const directiveNotes: string = DIRECTIVE_TYPES.map((t) => {
    return `- ${t}: structured_adjustment must be ${directiveTypeAdjustmentHint(t)}`;
  }).join("\n");

  return [
    "You are GridWise, a strict semantic interpreter of operator notes for a smart campus energy system.",
    "Interpret exactly one structured directive per operator note in the same order as the input list.",
    "All output MUST be a single JSON array. No prose, no markdown fences, no commentary.",
    "Each element of the array must have these exact fields:",
    '  { "note_index": number, "applies": boolean, "directive_type": string, "structured_adjustment": object|null, "explanation": string }',
    "",
    "Time windows are 0..23 integer hours. A window described as start-inclusive, end-exclusive MUST include every integer hour h with start <= h < end.",
    "Examples: 1 PM to 3 PM -> [13,14]; 6 PM to 9 PM -> [18,19,20]; 2 PM to 5 PM -> [14,15,16]; 12 AM to 2 AM -> [0,1]; 12 PM to 2 PM -> [12,13].",
    "Hours MUST be ascending, unique, and contain only integer hour values between 0 and 23.",
    "",
    "Directive types allowed and their structured_adjustment shapes:",
    directiveNotes,
    "",
    'For solar_reduction: "factor" is the remaining usable solar fraction (0..1). "Solar output will drop to about 20% from 1 PM to 3 PM." -> factor=0.2, hours=[13,14].',
    "For minimum_battery_reserve: when a percentage is given (e.g., 50%), emit is_percentage=true, percentage=<0..100>, and convert reserve_kwh to the implied fraction of capacity rounded to nearest kWh.",
    'For max_grid_window: grid_cap_kwh is the maximum allowed grid import during the listed hours.',
    'For no_charge_window or no_discharge_window: hours only.',
    'For no_op: applies=false and structured_adjustment=null. Use this for notes irrelevant to energy optimization (cafeteria menu, weather chat, schedules unrelated to batteries, solar, or grid).',
    "",
    "CRITICAL: Return ONLY the JSON array. Never include explanations, markdown, or extra text outside the JSON.",
  ].join("\n");
};

const buildUserPrompt = (operatorNotes: string[]): string => {
  const list = operatorNotes
    .map((n, i) => `${i}. ${JSON.stringify(n)}`)
    .join("\n");
  return `Interpret the following ${operatorNotes.length} operator notes into a JSON array. Preserve order by note_index.\n\n${list}\n\nReturn the JSON array now.`;
};

const callGroq = async (operatorNotes: string[]): Promise<string> => {
  if (!isGroqConfigured()) {
    throw new AppError(
      "LLM_INTERPRETATION_FAILED",
      "Groq API key not configured",
      503,
    );
  }
  const body = {
    model: config.groqModel,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(operatorNotes) },
    ],
    temperature: 0,
    response_format: { type: "json_object" as const },
  };
  for (let attempt = 0; attempt <= config.groqMaxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.groqTimeoutMs);
    try {
      const res = await request(config.groqUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.groqApiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.statusCode >= 400) {
        const text = await res.body.text();
        if (res.statusCode === 429 && attempt < config.groqMaxRetries) {
          const retryAfter = Number(res.headers["retry-after"]);
          const delayMs = Number.isFinite(retryAfter)
            ? Math.min(Math.max(retryAfter * 1000, 250), 4000)
            : 500 * (attempt + 1);
          logger.warn("Groq rate limited; retrying", { attempt: attempt + 1, delayMs });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new AppError(
          "LLM_INTERPRETATION_FAILED",
          res.statusCode === 429
            ? "Groq rate limit reached; please try again shortly"
            : `Groq returned status ${res.statusCode}`,
          503,
          text.slice(0, 200),
        );
      }
      const data = (await res.body.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new AppError("LLM_INTERPRETATION_FAILED", "Groq returned no content", 503);
      }
      return content;
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof AppError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new AppError("LLM_INTERPRETATION_FAILED", "Groq request timed out", 503);
      }
      throw new AppError(
        "LLM_INTERPRETATION_FAILED",
        e instanceof Error ? e.message : "Groq request failed",
        503,
      );
    }
  }
  throw new AppError("LLM_INTERPRETATION_FAILED", "Groq request failed", 503);
};

const extractArrayFromObject = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
};

const normalizeHours = (hours: unknown): number[] | null => {
  if (!Array.isArray(hours)) return null;
  const cleaned: number[] = [];
  const seen = new Set<number>();
  for (const h of hours) {
    if (typeof h !== "number" || !Number.isInteger(h) || h < 0 || h > 23) return null;
    if (seen.has(h)) return null;
    seen.add(h);
    cleaned.push(h);
  }
  cleaned.sort((a, b) => a - b);
  return cleaned;
};

// Removed: regex-based fallback directive parser.
// The LLM (Groq) is the single source of truth for directive interpretation.
// On any Groq failure (4xx, 5xx, timeout, parse error) we propagate
// LLM_INTERPRETATION_FAILED as 503. There is no silent regex fallback.

const normalizeAdjustment = (type: string, raw: unknown): StructuredAdjustment | string => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return "structured_adjustment must be an object or null";
  const obj = raw as Record<string, unknown>;
  const hours = normalizeHours(obj.hours);
  if (hours === null) return "structured_adjustment.hours must be ascending unique integers in 0..23";

  if (type === "solar_reduction") {
    const factor = obj.factor;
    if (typeof factor !== "number" || !Number.isFinite(factor) || factor < 0 || factor > 1) {
      return "solar_reduction.factor must be in [0,1]";
    }
    return { hours, factor };
  }
  if (type === "minimum_battery_reserve") {
    const isPercentage =
      obj.is_percentage === true ||
      (typeof obj.percentage === "number" && obj.reserve_kwh === undefined);
    if (isPercentage) {
      const percentage = obj.percentage;
      if (
        typeof percentage !== "number" ||
        !Number.isFinite(percentage) ||
        percentage < 0 ||
        percentage > 100
      ) {
        return "minimum_battery_reserve.percentage must be in [0,100]";
      }
      return {
        hours,
        reserve_kwh: typeof obj.reserve_kwh === "number" ? obj.reserve_kwh : 0,
        is_percentage: true,
        percentage,
      };
    }
    const reserve = obj.reserve_kwh;
    if (typeof reserve !== "number" || !Number.isFinite(reserve) || reserve < 0) {
      return "minimum_battery_reserve.reserve_kwh must be a non-negative number";
    }
    return { hours, reserve_kwh: reserve, is_percentage: false };
  }
  if (type === "no_charge_window" || type === "no_discharge_window") {
    return { hours };
  }
  if (type === "max_grid_window") {
    const cap = obj.grid_cap_kwh;
    if (typeof cap !== "number" || !Number.isFinite(cap) || cap < 0) {
      return "max_grid_window.grid_cap_kwh must be a non-negative number";
    }
    return { hours, grid_cap_kwh: cap };
  }
  if (type === "no_op") {
    return null;
  }
  return "unknown directive_type";
};

const coerceDirectiveType = (raw: unknown): typeof DIRECTIVE_TYPES[number] | null => {
  if (typeof raw !== "string") return null;
  const found = DIRECTIVE_TYPES.find((t) => t === raw);
  return found ?? null;
};

const enforceCoverageAndOrder = (
  directives: DirectiveInterpretation[],
  noteCount: number,
): { ok: true } | { ok: false; reason: string } => {
  if (directives.length !== noteCount) {
    return { ok: false, reason: `expected ${noteCount} directives, got ${directives.length}` };
  }
  const seen = new Set<number>();
  for (let i = 0; i < directives.length; i++) {
    const d = directives[i];
    if (d.note_index !== i) {
      return { ok: false, reason: `note_index must equal position (${i}) at index ${i}` };
    }
    if (seen.has(d.note_index)) {
      return { ok: false, reason: `duplicate note_index ${d.note_index}` };
    }
    seen.add(d.note_index);
  }
  return { ok: true };
};

export const interpretDirectives = async (
  operatorNotes: string[],
): Promise<DirectiveInterpretation[]> => {
  if (operatorNotes.length === 0) {
    logger.debug("No operator notes supplied; skipping Groq interpretation");
    return [];
  }

  try {
    const rawContent = await callGroq(operatorNotes);
    const cleaned = stripJsonWrappers(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      try {
        const obj = JSON.parse(cleaned) as Record<string, unknown>;
        const arr = extractArrayFromObject(obj);
        if (arr.length === 0) {
          throw new Error("no array found");
        }
        parsed = arr;
      } catch {
        throw new AppError(
          "LLM_INTERPRETATION_FAILED",
          "Could not parse Groq response as JSON",
          502,
        );
      }
    }
    const baseCandidate: unknown[] = Array.isArray(parsed)
      ? (parsed as unknown[])
      : extractArrayFromObject(parsed);

    let candidate: unknown[];
    if (baseCandidate.length > 0) {
      candidate = baseCandidate;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.directive_type === "string" || typeof obj.note_index === "number") {
        candidate = [obj];
      } else {
        candidate = [];
      }
    } else {
      candidate = [];
    }

    if (!Array.isArray(candidate) || candidate.length === 0) {
      throw new AppError(
        "LLM_INTERPRETATION_FAILED",
        "Groq response did not contain a directive array",
        503,
      );
    }

    const normalized: DirectiveInterpretation[] = [];
    for (let i = 0; i < candidate.length; i++) {
      const item = candidate[i] as Record<string, unknown>;
      const noteIndexRaw = item.note_index;
      let appliesRaw: unknown = item.applies;
      const typeRaw = item.directive_type;
      const explanationRaw = item.explanation;
      const adjRaw = item.structured_adjustment;

      const noteIndex =
        typeof noteIndexRaw === "number" && Number.isInteger(noteIndexRaw) && noteIndexRaw >= 0
          ? noteIndexRaw
          : i;
      if (noteIndex >= operatorNotes.length) {
        throw new AppError(
          "DIRECTIVE_VALIDATION_FAILED",
          `note_index ${noteIndex} out of range`,
        );
      }

      if (typeof appliesRaw !== "boolean") {
        if (typeRaw === "no_op") {
          appliesRaw = false;
        } else if (typeof typeRaw === "string") {
          appliesRaw = true;
        } else {
          throw new AppError(
            "DIRECTIVE_VALIDATION_FAILED",
            `applies must be boolean at note_index ${noteIndex}`,
          );
        }
      }
      const explanation =
        typeof explanationRaw === "string"
          ? explanationRaw
          : `Interpreted ${typeRaw ?? "directive"} from operator note.`;

      const directiveType = coerceDirectiveType(typeRaw);
      if (!directiveType) {
        throw new AppError(
          "DIRECTIVE_VALIDATION_FAILED",
          `invalid directive_type at note_index ${noteIndex}`,
        );
      }

      if (appliesRaw === false) {
        normalized.push({
          note_index: noteIndex,
          applies: false,
          directive_type: directiveType,
          structured_adjustment: null,
          explanation,
        });
        continue;
      }

      if (directiveType === "no_op") {
        throw new AppError(
          "DIRECTIVE_VALIDATION_FAILED",
          `no_op must have applies=false at note_index ${noteIndex}`,
        );
      }

      const adjResult = normalizeAdjustment(directiveType, adjRaw);
      if (typeof adjResult === "string") {
        throw new AppError("DIRECTIVE_VALIDATION_FAILED", adjResult);
      }

      normalized.push({
        note_index: noteIndex,
        applies: true,
        directive_type: directiveType,
        structured_adjustment: adjResult,
        explanation,
      });
    }

    for (const n of normalized) {
      if (n.applies && n.directive_type === "no_op") {
        throw new AppError("DIRECTIVE_VALIDATION_FAILED", "no_op with applies=true");
      }
    }

    const coverage = enforceCoverageAndOrder(normalized, operatorNotes.length);
    if (coverage.ok === false) {
      throw new AppError("DIRECTIVE_VALIDATION_FAILED", coverage.reason);
    }

    const schemaCheck = directiveListSchema.safeParse(normalized);
    if (!schemaCheck.success) {
      throw new AppError(
        "DIRECTIVE_VALIDATION_FAILED",
        schemaCheck.error.issues[0]?.message ?? "schema mismatch",
      );
    }

    logger.debug("Directives interpreted", { count: normalized.length });
    return normalized;
  } catch (error) {
    // Re-throw AppError (LLM_INTERPRETATION_FAILED, DIRECTIVE_VALIDATION_FAILED)
    // so the controller surfaces them to the caller. There is no silent fallback.
    throw error;
  }
};
