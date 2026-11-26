import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Card from "../../components/UI/Card";

const VIEWS = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
];

const DAY_RANGES = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
];

// Chhote screen par bade amounts (1,20,000) axis me jagah na ghere
const compact = (v) => {
  const n = Number(v) || 0;
  if (n >= 10000000) return `${+(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${+(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(n);
};

const pill = (active) =>
  `rounded-lg px-3 py-1 text-xs font-bold transition ${
    active
      ? "bg-white text-emerald-700 shadow-sm"
      : "text-slate-500 hover:text-slate-700"
  }`;

export default function MonthlyChart({ data = [], dailyData = [], inr }) {
  const [view, setView] = useState("daily");
  const [range, setRange] = useState(30);

  const isDaily = view === "daily";

  const chartData = useMemo(() => {
    if (isDaily) return dailyData.slice(-range);
    return data.slice(-6);
  }, [isDaily, dailyData, data, range]);

  const total = useMemo(
    () => chartData.reduce((s, d) => s + (d.income || 0), 0),
    [chartData]
  );

  const activeDays = useMemo(
    () => chartData.filter((d) => (d.income || 0) > 0).length,
    [chartData]
  );

  const subtitle = isDaily
    ? `Last ${range} days: ${inr(total)} (${activeDays} din kaam hua)`
    : `Last 6 months: ${inr(total)}`;

  // 30 din me har label dikhana bheed karta hai
  const tickGap = isDaily && range > 7 ? 24 : 8;

  return (
    <Card className="p-6 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">
            {isDaily ? "Daily Income" : "Monthly Income"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDaily && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              {DAY_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={pill(range === r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex rounded-xl bg-slate-100 p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={pill(view === v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              minTickGap={tickGap}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={compact}
              width={44}
            />
            <Tooltip
              formatter={(v) => [inr(v), "Income"]}
              labelFormatter={(label, items) => items?.[0]?.payload?.fullLabel || label}
              contentStyle={{ borderRadius: 16, border: "1px solid #f1f5f9" }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#16A34A"
              strokeWidth={2.5}
              fill="url(#incomeGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}