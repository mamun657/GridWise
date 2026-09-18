const http = require('http');

const req = (path, method, body) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      { host: '127.0.0.1', port: 4000, path, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}, timeout: 60000 },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (e) {
            resolve({ status: res.statusCode, body: chunks });
          }
        });
      },
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });

const hourly = [];
for (let h = 0; h < 24; h++) {
  const demand = h < 6 || h >= 22 ? 60 : h < 18 ? 120 : 200;
  const solar = h >= 7 && h <= 17 ? 80 * Math.exp(-0.5 * ((h - 12) ** 2) / 9) : 0;
  const tariff = h >= 18 && h <= 21 ? 18 : h >= 6 && h <= 9 ? 14 : 8;
  hourly.push({ hour: h, demand_kwh: demand, solar_kwh: Number(solar.toFixed(3)), tariff_bdt_per_kwh: tariff });
}

const payload = {
  scenario_id: 'live-smoke-everything',
  operator_notes: [
    'Solar output will drop to about 20% from 1 PM to 3 PM.',
    'Keep at least 150 kWh from 6 PM to 9 PM.',
    'Do not charge from 2 PM to 5 PM.',
    'Battery discharge unavailable from 6 PM to 8 PM.',
    'Grid import must stay below 155 kWh from 6 PM to 9 PM.',
    'The cafeteria menu changes tomorrow.',
  ],
  hourly: hourly,
  battery: {
    capacity_kwh: 500,
    initial_energy_kwh: 200,
    minimum_energy_kwh: 50,
    max_charge_kwh_per_hour: 120,
    max_discharge_kwh_per_hour: 150,
  },
};

req('/optimize-energy', 'POST', payload).then((r) => {
  console.log('STATUS', r.status);
  console.log('RAW', JSON.stringify(r.body).slice(0, 1000));
  console.log('SCENARIO', r.body.scenario_id);
  console.log('DIRECTIVES');
  for (const d of r.body.directive_interpretation || []) {
    console.log('  ', d.note_index, d.directive_type, d.applies, JSON.stringify(d.structured_adjustment));
  }
  console.log('PLAN HOUR COUNT', (r.body.hourly_plan || []).length);
  console.log('TOTALS', { grid: r.body.total_grid_kwh, cost: r.body.total_cost_bdt, peak: r.body.peak_grid_kwh });
  console.log('FIRST 6 HOURS');
  for (let i = 0; i < 6; i++) {
    const p = r.body.hourly_plan[i];
    console.log('  ', p.hour, 'grid', p.grid_kwh.toFixed(2), 'solar_used', p.solar_used_kwh.toFixed(2), 'action', p.battery_action, 'b_kwh', p.battery_kwh.toFixed(2), 'b_e_after', p.battery_energy_after_kwh.toFixed(2));
  }
  console.log('LAST 6 HOURS');
  for (let i = 18; i < 24; i++) {
    const p = r.body.hourly_plan[i];
    console.log('  ', p.hour, 'grid', p.grid_kwh.toFixed(2), 'solar_used', p.solar_used_kwh.toFixed(2), 'action', p.battery_action, 'b_kwh', p.battery_kwh.toFixed(2), 'b_e_after', p.battery_energy_after_kwh.toFixed(2));
  }
  if (r.body.error) {
    console.log('ERROR', JSON.stringify(r.body.error));
  }
});
