const http = require("http");
function post(p, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const r = http.request({ host: "127.0.0.1", port: 4000, path: p, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, timeout: 90000 },
      (res) => { let b=""; res.on("data", c=>b+=c); res.on("end", ()=>{ try{resolve({status:res.statusCode, body:JSON.parse(b)})}catch{resolve({status:res.statusCode, body:b})} }); });
    r.on("error", reject); r.write(data); r.end();
  });
}
(async () => {
  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const demand = h < 6 ? 60 : h < 10 ? 140 : h < 17 ? 180 : h < 22 ? 220 : 90;
    const solar = h >= 7 && h <= 17 ? Math.round(160 * Math.exp(-0.5 * ((h - 12) ** 2) / 9) * 1000) / 1000 : 0;
    const tariff = h >= 18 && h <= 21 ? 18 : h >= 6 && h <= 9 ? 14 : 8;
    hourly.push({ hour: h, demand_kwh: demand, solar_kwh: solar, tariff_bdt_per_kwh: tariff });
  }
  const r = await post("/optimize-energy", {
    scenario_id: "GW-PUB-001-solar-evening-reserve",
    operator_notes: [
      "Solar output will drop to about 20% from 1 PM to 3 PM.",
      "Keep at least 120 kWh from 6 PM to 9 PM.",
      "Do not charge from 2 PM to 5 PM.",
      "Grid import must stay below 155 kWh from 6 PM to 9 PM.",
      "The cafeteria menu changes tomorrow."
    ],
    hourly,
    battery: { capacity_kwh: 400, initial_energy_kwh: 200, minimum_energy_kwh: 80, max_charge_kwh_per_hour: 120, max_discharge_kwh_per_hour: 120 },
  });
  console.log("STATUS", r.status);
  console.log(JSON.stringify(r.body, null, 2));
})();
