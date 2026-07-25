import React from "react";
import Card from "./Card";

export default function StatCard({ Icon, label, value, sub, tone = "green" }) {
  const tones = {
    green: "bg-green-600",
    dark: "bg-slate-900",
    amber: "bg-amber-500",
    red: "bg-red-500"
  };
  const toneCls = tones[tone] || tones.green;
  return (
    <Card className="p-5 hover:shadow-md transition-shadow duration-300 h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <div className={`${toneCls} w-full h-full rounded-2xl flex items-center justify-center text-white`}>
            {Icon ? <Icon size={20} /> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}