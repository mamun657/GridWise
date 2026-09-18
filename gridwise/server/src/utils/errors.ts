export type ErrorCode =
  | "INVALID_REQUEST"
  | "LLM_INTERPRETATION_FAILED"
  | "DIRECTIVE_VALIDATION_FAILED"
  | "OPTIMIZATION_FAILED"
  | "PLAN_VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  code: ErrorCode;
  details?: unknown;
  status: number;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const buildErrorBody = (
  code: ErrorCode,
  message: string,
  details?: unknown,
) => {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
};
