
import React from "react";
import { CheckCircle2 } from "lucide-react";

const StepCard = ({
  number,
  title,
  description,
  image,
  tips,
}) => {
  return (
    <div className="relative flex gap-4 pb-7 last:pb-0">
      {/* Timeline */}
      <div className="relative flex flex-col items-center">
        <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
          {number}
        </div>

        <div className="absolute top-10 h-full w-px bg-green-200" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold text-slate-800">
          {title}
        </h3>

        <p className="text-sm leading-6 text-slate-600">
          {description}
        </p>

        {image && (
          <div className="mt-4 overflow-hidden rounded-lg border">
            <img
              src={image}
              alt={title}
              className="h-auto w-full object-cover"
            />
          </div>
        )}

        {tips && (
          <div className="mt-4 flex gap-2 rounded-lg bg-green-50 p-3">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <p className="text-xs leading-5 text-green-800">
              <strong>Tip:</strong> {tips}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepCard;
