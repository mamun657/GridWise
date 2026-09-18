const { optimizeEnergy } = require('../dist/src/optimizer/energyLp');
const { loadSampleCases, loadHourlyProfile } = require('../dist/src/utils/sampleCases');
const { validateHourlyPlan } = require('../dist/src/services/validationService');

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
  for (let i = 0; i < 24; i++) {
    console.log(
      'h',
      i,
      'grid',
      plan[i].grid_kwh.toFixed(3),
      'su',
      plan[i].solar_used_kwh.toFixed(3),
      'act',
      plan[i].battery_action,
      'kwh',
      plan[i].battery_kwh.toFixed(3),
      'after',
      plan[i].battery_energy_after_kwh.toFixed(3),
    );
  }
  const v = validateHourlyPlan(plan, hourly, c.battery, dir);
  if (!v.ok) {
    console.error('VALIDATION FAIL', v.reason);
  } else {
    console.log('VALID OK', v.totals);
  }
})().catch((e) => console.error('FAIL', e.message));
