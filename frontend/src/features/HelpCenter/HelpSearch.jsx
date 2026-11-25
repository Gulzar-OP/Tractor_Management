
import React, { useMemo, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";

const HelpSearch = ({ sections = [], onSelect }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const filteredSections = useMemo(() => {
    if (!query.trim()) return [];

    return sections.filter((section) =>
      `${section.title} ${section.description}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [query, sections]);

  const handleSelect = (id) => {
    onSelect(id);
    setQuery("");
    setFocused(false);
  };

  return (
    <div className="relative max-w-xl">
      <div
        className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-slate-700 transition ${
          focused
            ? "border-green-400 ring-4 ring-green-500/10"
            : "border-transparent"
        }`}
      >
        <Search size={20} className="shrink-0 text-slate-400" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredSections[0]) {
              handleSelect(filteredSections[0].id);
            }
            if (e.key === "Escape") {
              setQuery("");
              setFocused(false);
            }
          }}
          placeholder="Search farmers, payments, advance..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {focused && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredSections.length > 0 ? (
            filteredSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(section.id)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left last:border-0 hover:bg-green-50"
                >
                  <div className="rounded-lg bg-green-100 p-2 text-green-700">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {section.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {section.description}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={17}
                    className="text-slate-400"
                  />
                </button>
              );
            })
          ) : (
            <div className="p-5 text-center">
              <Search
                size={25}
                className="mx-auto mb-2 text-slate-300"
              />
              <p className="text-sm font-medium text-slate-700">
                No results found
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try searching another keyword.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HelpSearch;
