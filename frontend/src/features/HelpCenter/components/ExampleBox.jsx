
import React from "react";
import {
  Lightbulb,
  Calculator,
  CheckCircle2,
  Info,
} from "lucide-react";

const ExampleBox = ({
  title = "Real-life Example",
  description,
  items = [],
  calculation,
  result,
  tip,
  variant = "success",
}) => {
  const styles = {
    success: {
      wrapper: "border-green-200 bg-green-50",
      icon: "text-green-700",
      result: "bg-green-100 text-green-800",
    },
    info: {
      wrapper: "border-blue-200 bg-blue-50",
      icon: "text-blue-700",
      result: "bg-blue-100 text-blue-800",
    },
    warning: {
      wrapper: "border-amber-200 bg-amber-50",
      icon: "text-amber-700",
      result: "bg-amber-100 text-amber-800",
    },
  };

  const style = styles[variant] || styles.success;

  return (
    <div
      className={`my-6 rounded-xl border p-5 ${style.wrapper}`}
    >
      {/* Heading */}
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-white p-2">
          <Lightbulb size={20} className={style.icon} />
        </div>

        <h3 className="font-bold text-slate-800">
          {title}
        </h3>
      </div>

      {description && (
        <p className="mb-4 text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg bg-white">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
            >
              <span className="text-sm text-slate-600">
                {item.label}
              </span>

              <span className="text-sm font-semibold text-slate-800">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calculation */}
      {calculation && (
        <div className="mb-4 rounded-lg bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calculator size={17} />
            Calculation
          </div>

          <p className="text-sm leading-6 text-slate-600">
            {calculation}
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 ${style.result}`}>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase">
            <CheckCircle2 size={16} />
            Result
          </div>

          <p className="text-lg font-bold">
            {result}
          </p>
        </div>
      )}

      {/* Tip */}
      {tip && (
        <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
          <Info size={17} className="mt-0.5 shrink-0" />
          <p>{tip}</p>
        </div>
      )}
    </div>
  );
};

export default ExampleBox;
