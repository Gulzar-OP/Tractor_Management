import React from "react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import Card from "../../components/UI/Card";

export default function MonthlyChart({ data, inr }) {
  return (
    <Card className="p-6 xl:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Monthly Income</h3>
        <p className="text-xs text-slate-400">Last 6 months performance</p>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 16, border: "1px solid #f1f5f9" }} />
            <Area type="monotone" dataKey="income" stroke="#16A34A" strokeWidth={2.5} fill="url(#incomeGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}