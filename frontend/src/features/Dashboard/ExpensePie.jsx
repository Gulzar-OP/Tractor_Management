import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Card from "../../components/UI/Card";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#14b8a6"];

export default function ExpensePie({ data = [], inr }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Expense Breakdown</h3>
      <p className="text-xs text-slate-400 mb-4">This month</p>

      <div style={{ width: "100%", height: 220 }}>
        {data.length > 0 ? (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name || index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => inr(Number(value) || 0)}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No expense data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((e, index) => (
          <div key={e.name || index} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: e.color || COLORS[index % COLORS.length] }}
            />
            {e.name}
          </div>
        ))}
      </div>
    </Card>
  );
}