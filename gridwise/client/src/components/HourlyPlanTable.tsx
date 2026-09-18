import type { BatteryAction, HourlyPlan, HourlyRecord } from "../types";
import { Glyph } from "./ui/Icon";

const actionStyle: Record<BatteryAction, { wrap: string; label: string; icon: React.ReactNode }> = {
  charge: {
    wrap: "bg-ok-50 text-ok-700 border-ok-100",
    label: "Charge",
    icon: <Glyph name="plus" size={11} />,
  },
  discharge: {
    wrap: "bg-crit-50 text-crit-700 border-crit-100",
    label: "Discharge",
    icon: <Glyph name="bolt" size={11} />,
  },
  idle: {
    wrap: "bg-canvas-muted text-ink-500 border-canvas-border",
    label: "Idle",
    icon: <Glyph name="activity" size={11} />,
  },
};

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}

export function HourlyPlanTable({
  plan,
  hourly,
}: {
  plan: HourlyPlan[];
  hourly?: HourlyRecord[];
}) {
  const demandByHour = new Map((hourly ?? []).map((h) => [h.hour, h.demand_kwh]));
  const tariffByHour = new Map((hourly ?? []).map((h) => [h.hour, h.tariff_bdt_per_kwh]));

  return (
    <div className="gw-table-wrap">
      <table className="gw-table min-w-[760px]">
        <thead>
          <tr>
            <th className="px-3 py-2.5 text-left">Hour</th>
            <th className="px-3 py-2.5 text-right">Demand</th>
            <th className="px-3 py-2.5 text-right">Solar used</th>
            <th className="px-3 py-2.5 text-right">Grid</th>
            <th className="px-3 py-2.5 text-right">Battery</th>
            <th className="px-3 py-2.5 text-center">Action</th>
            <th className="px-3 py-2.5 text-right">Tariff</th>
            <th className="px-3 py-2.5 text-right">Battery after</th>
          </tr>
        </thead>
        <tbody>
          {plan.map((p) => {
            const a = actionStyle[p.battery_action];
            return (
              <tr key={p.hour}>
                <td className="px-3 py-2">
                  <span className="inline-flex h-6 w-12 items-center justify-center rounded-sm bg-canvas-muted font-mono text-[11.5px] font-semibold text-ink-700 ring-1 ring-canvas-border gw-tabnum">
                    {p.hour.toString().padStart(2, "0")}:00
                  </span>
                </td>
                <td className="px-3 py-2 text-right gw-tabnum text-ink-700">
                  {fmt(demandByHour.get(p.hour) ?? 0)}
                </td>
                <td className="px-3 py-2 text-right gw-tabnum text-warn-700">
                  {fmt(p.solar_used_kwh)}
                </td>
                <td className="px-3 py-2 text-right gw-tabnum text-grid-600">
                  {fmt(p.grid_kwh)}
                </td>
                <td className="px-3 py-2 text-right gw-tabnum text-ok-700">
                  {fmt(p.battery_kwh)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`gw-pill border ${a.wrap}`}>
                    {a.icon}
                    {a.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right gw-tabnum text-ink-500">
                  {fmt(tariffByHour.get(p.hour) ?? 0, 2)}
                </td>
                <td className="px-3 py-2 text-right gw-tabnum font-semibold text-ink-900">
                  {fmt(p.battery_energy_after_kwh)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
