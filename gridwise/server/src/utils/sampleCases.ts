import fs from "fs";
import path from "path";
import { OptimizeRequest } from "../schemas/request";

export type SampleCase = {
  scenario_id: string;
  description: string;
  operator_notes: string[];
  battery: OptimizeRequest["battery"];
};

export type SampleCaseFile = {
  cases: SampleCase[];
};

const resolveSamplesDir = (): string => {
  const here = __dirname;
  const candidates = [
    path.resolve(here, "..", "..", "..", "..", "public-sample-cases"),
    path.resolve(process.cwd(), "public-sample-cases"),
    path.resolve(process.cwd(), "..", "public-sample-cases"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "sample-cases.json"))) return c;
  }
  return candidates[0];
};

const SAMPLES_DIR = resolveSamplesDir();

const readJsonFile = <T>(fileName: string): T => {
  const fullPath = path.join(SAMPLES_DIR, fileName);
  const text = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(text) as T;
};

export const loadSampleCases = (): SampleCase[] => {
  const data = readJsonFile<SampleCaseFile>("sample-cases.json");
  return data.cases;
};

export const loadHourlyProfile = (): OptimizeRequest["hourly"] => {
  const data = readJsonFile<{ hourly: OptimizeRequest["hourly"] }>("hourly-profile.json");
  return data.hourly;
};

export const buildSampleRequest = (scenario: SampleCase): OptimizeRequest => {
  return {
    scenario_id: scenario.scenario_id,
    operator_notes: scenario.operator_notes,
    hourly: loadHourlyProfile(),
    battery: scenario.battery,
  };
};
