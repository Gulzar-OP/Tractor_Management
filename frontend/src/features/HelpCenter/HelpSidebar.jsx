
import React from "react";

const HelpSidebar = ({
  sections,
  activeSection,
  onSelect,
}) => {
  return (
    <aside className="rounded-xl bg-white p-4">
      <h3 className="mb-4 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
        User Guide
      </h3>

      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSelect(section.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                active
                  ? "bg-green-50 text-green-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={19} />

              <span className="flex-1 text-sm font-medium">
                {section.title}
              </span>

              {active && (
                <span className="h-2 w-2 rounded-full bg-green-600" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default HelpSidebar;
