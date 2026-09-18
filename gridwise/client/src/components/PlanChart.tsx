import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { HourlyPlan, HourlyRecord } from "../types";

type Row = {
  hour: string;
  hourRaw: number;
  Solar: number;
  Grid: number;
  Battery: number;
  "Battery SOC": number;
  Tariff: number;
};

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as Row | undefined;
  return (
    <div className="gw-recharts-tooltip">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
          {label}
        </span>
        {data && (
          <span className="text-[11px] text-ink-300">tariff {data.Tariff.toFixed(2)} BDT/kWh</span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey?.toString()} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-ink-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
                aria-hidden="true"
              />
              <span className="text-[12.5px]">{p.name}</span>
            </span>
            <span className="text-[12.5px] font-semibold text-ink-900 gw-tabnum">
              {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
              <span className="ml-1 text-[10.5px] font-normal text-ink-300">kWh</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanChart({ plan, hourly }: { plan: HourlyPlan[]; hourly: HourlyRecord[] }) {
  const tariffByHour = new Map(hourly.map((h) => [h.hour, h.tariff_bdt_per_kwh]));
  const data: Row[] = plan.map((p) => ({
    hour: `${p.hour.toString().padStart(2, "0")}:00`,
    hourRaw: p.hour,
    Solar: Number(p.solar_used_kwh.toFixed(2)),
    Grid: Number(p.grid_kwh.toFixed(2)),
    Battery: Number(p.battery_kwh.toFixed(2)),
    "Battery SOC": Number(p.battery_energy_after_kwh.toFixed(2)),
    Tariff: tariffByHour.get(p.hour) ?? 0,
  }));

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 18, left: -6, bottom: 0 }}
          barCategoryGap={6}
        >
          <defs>
            <linearGradient id="gwSolar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="gwGrid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="gwBattery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E3E8F0" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={{ stroke: "#CBD3E1" }}
            interval={2}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={42}
            label={{
              value: "kWh",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#94A3B8", textAnchor: "middle" },
              offset: 18,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={42}
            label={{
              value: "kWh / BDT",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 11, fill: "#94A3B8", textAnchor: "middle" },
              offset: 14,
            }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.06)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-[12px] text-ink-500">{value}</span>}
          />
          <Bar yAxisId="left" dataKey="Solar" stackId="a" fill="url(#gwSolar)" maxBarSize={18} />
          <Bar yAxisId="left" dataKey="Grid" stackId="a" fill="url(#gwGrid)" maxBarSize={18} />
          <Bar yAxisId="left" dataKey="Battery" stackId="a" fill="url(#gwBattery)" maxBarSize={18} radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Battery SOC"
            stroke="#312E81"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#312E81" }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Tariff"
            stroke="#F97316"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: "#F97316" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
