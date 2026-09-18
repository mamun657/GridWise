declare module "glpk.js/node" {
  import type { LP, Options, Result } from "glpk.js/dist/types.js";
  const factory: () => Promise<{
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
  }>;
  export default factory;
}
