const { buildProblem } = require('../dist/src/optimizer/energyLp');
const { loadSampleCases, loadHourlyProfile } = require('../dist/src/utils/sampleCases');

const cases = loadSampleCases();
const hourly = loadHourlyProfile();
const c = cases[0];
const dir = {
  solarFactorByHour: new Array(24).fill(1),
  reserveKwhByHour: new Array(24).fill(0),
  noChargeHours: new Set(),
  noDischargeHours: new Set(),
  maxGridByHour: new Array(24).fill(1e9),
};
const p = buildProblem(hourly, c.battery, dir);
console.log(JSON.stringify(p.lp, null, 2));
