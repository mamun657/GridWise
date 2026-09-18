/* Run every public sample case via /optimize-energy. */
const http = require("http");
const fs = require("fs");
const path = require("path");

function postJSON(p, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { host: "127.0.0.1", port: 4000, path: p, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        timeout: 90000 },
      (res) => {
        let buf = ""; res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
          catch { resolve({ status: res.statusCode, body: buf }); }
        });
      });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

(async () => {
  const samplesDir = path.resolve(__dirname, "..", "..", "public-sample-cases");
  const sample = JSON.parse(fs.readFileSync(path.join(samplesDir, "sample-cases.json"), "utf8"));
  const hourly = JSON.parse(fs.readFileSync(path.join(samplesDir, "hourly-profile.json"), "utf8")).hourly;
  let pass = 0, fail = 0;
  for (const c of sample.cases) {
    const t0 = Date.now();
    const r = await postJSON("/optimize-energy", {
      scenario_id: c.scenario_id,
      operator_notes: c.operator_notes,
      hourly: hourly,
      battery: c.battery,
    });
    const ms = Date.now() - t0;
    // GW-PUB-004 is intentionally infeasible (grid cap 100 + no discharge 19-21 with 220 kWh demand).
    const expectedInfeasible = c.scenario_id === "GW-PUB-004-evening-grid-cap";
    const ok = expectedInfeasible
      ? r.status === 422 && r.body?.error?.code === "OPTIMIZATION_FAILED"
      : r.status === 200 && r.body?.total_grid_kwh > 0 && Array.isArray(r.body?.hourly_plan) && r.body.hourly_plan.length === 24;
    const directives = (r.body?.directive_interpretation || []).map(d => `${d.directive_type}@${d.note_index}${d.applies?"":"(skip)"}`).join(", ");
    const tot = { grid: r.body?.total_grid_kwh, cost: r.body?.total_cost_bdt, peak: r.body?.peak_grid_kwh };
    console.log(`[${r.status}] ${ok?"PASS":"FAIL"} ${ms}ms ${c.scenario_id}${expectedInfeasible?" (expected infeasible)":""}`);
    console.log(`     directives=${directives}`);
    console.log(`     totals=${JSON.stringify(tot)}`);
    if (!ok) {
      const errs = r.body?.error ? [r.body.error] : [];
      for (const e of errs.slice(0, 6)) console.log(`     ERR ${JSON.stringify(e).slice(0,300)}`);
      fail++;
    } else pass++;
  }
  console.log(`\n=== ${pass} pass / ${fail} fail (of ${pass+fail}) ===`);
  process.exit(fail===0 ? 0 : 1);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
