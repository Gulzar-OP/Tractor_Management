
import React from "react";
import { ArrowRight, Clock } from "lucide-react";

const GuideCard = ({
  title,
  description,
  icon: Icon,
  duration = "3 min read",
  onClick,
  active = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl border p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-green-300 hover:shadow-md ${
        active
          ? "border-green-400 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-xl bg-green-100 p-3 text-green-700 transition group-hover:bg-green-200">
          {Icon && <Icon size={23} />}
        </div>

        <ArrowRight
          size={19}
          className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-green-600"
        />
      </div>

      <h3 className="mb-2 font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mb-4 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Clock size={14} />
        {duration}
      </div>
    </button>
  );
};

export default GuideCard;
