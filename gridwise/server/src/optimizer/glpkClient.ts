import type { LP, Options, Result } from "glpk.js/dist/types.js";

type GLPKModule = {
  GLP_MIN: number;
  GLP_MAX: number;
  GLP_FR: number;
  GLP_LO: number;
  GLP_UP: number;
  GLP_DB: number;
  GLP_FX: number;
  GLP_MSG_OFF: number;
  GLP_MSG_ERR: number;
  GLP_MSG_ON: number;
  GLP_MSG_ALL: number;
  GLP_UNDEF: number;
  GLP_FEAS: number;
  GLP_INFEAS: number;
  GLP_NOFEAS: number;
  GLP_OPT: number;
  GLP_UNBND: number;
  solve: (lp: LP, options?: number | Options) => Result;
};

let glpkPromise: Promise<GLPKModule> | null = null;

export const loadGlpk = async (): Promise<GLPKModule> => {
  if (!glpkPromise) {
    glpkPromise = (async () => {
      const nodeModule = (await Function(
        "return import('glpk.js/node')",
      )()) as { default?: () => Promise<GLPKModule> };
      const factory = nodeModule.default;
      if (typeof factory !== "function") {
        throw new Error("GLPK Node factory is unavailable");
      }
      return await factory();
    })();
  }
  return glpkPromise;
};

export const resetGlpkCache = (): void => {
  glpkPromise = null;
};
