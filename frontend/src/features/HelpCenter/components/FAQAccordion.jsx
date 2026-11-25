
import React, { useState } from "react";
import {
  ChevronDown,
  CircleHelp,
} from "lucide-react";

const FAQAccordion = ({ faqs = [] }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex((prev) =>
      prev === index ? null : index
    );
  };

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={faq.id || index}
            className={`overflow-hidden rounded-xl border transition ${
              isOpen
                ? "border-green-300 bg-green-50/50"
                : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleFAQ(index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <CircleHelp
                  size={19}
                  className="shrink-0 text-green-600"
                />

                <span className="text-sm font-semibold text-slate-800">
                  {faq.question}
                </span>
              </div>

              <ChevronDown
                size={19}
                className={`shrink-0 text-slate-500 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                <p className="pl-8 text-sm leading-6 text-slate-600">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FAQAccordion;
