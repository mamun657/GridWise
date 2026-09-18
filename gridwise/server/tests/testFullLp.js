const { optimizeEnergy } = require('../dist/src/optimizer/energyLp');
const { loadSampleCases, loadHourlyProfile } = require('../dist/src/utils/sampleCases');

(async () => {
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
  const plan = await optimizeEnergy(hourly, c.battery, dir);
  console.log('OK', plan.length);
  console.log(JSON.stringify(plan.slice(0, 6), null, 2));
})().catch((e) => {
  console.error('FAIL', e);
});
