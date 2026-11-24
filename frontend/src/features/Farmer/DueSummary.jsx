import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  Users,
  CheckCircle2,
  Wallet,
  Phone,
  MapPin,
  Search,
  X,
  CreditCard,
  RefreshCw,
  ArrowUpDown,
  SearchX,
} from "lucide-react";
import { inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

// Deterministic gradient per farmer so avatars stay distinct and stable across re-renders
const AVATAR_THEMES = [
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-pink-500",
  "from-lime-500 to-emerald-600",
  "from-violet-500 to-purple-500",
];

function avatarTheme(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function Avatar({ name, size = "h-12 w-12 text-sm" }) {
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTheme(
        name
      )} font-bold text-white shadow-md ring-2 ring-white`}
    >
      {initials(name)}
    </div>
  );
}

const SORTS = {
  dueDesc: { label: "Highest due", fn: (a, b) => b.due - a.due },
  dueAsc: { label: "Lowest due", fn: (a, b) => a.due - b.due },
  name: { label: "Name A–Z", fn: (a, b) => a.name.localeCompare(b.name) },
};

/* ------------------------------ page ------------------------------ */

export default function DueSummary() {
  const navigate = useNavigate();

  const [farmerRecords, setFarmerRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("dueDesc");

  const fetchFarmerRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/work/due-summary`,
        { withCredentials: true }
      );

      const list =
        response.data?.farmers || response.data?.all || response.data?.data || [];
      setFarmerRecords(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching farmer records:", err);
      setError(err.response?.data?.message || "Failed to load due summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarmerRecords();
  }, [fetchFarmerRecords]);

  /* ---------------- derived ---------------- */

  // Normalise numbers once so the rest of the page never repeats Number(... || 0)
  const rows = useMemo(
    () =>
      farmerRecords.map((f) => ({
        ...f,
        name: f.name || "Unknown",
        due: Number(f.totalDueAmount || 0),
        paid: Number(f.totalPaidAmount || 0),
        billed: Number(f.totalBilledAmount || 0),
      })),
    [farmerRecords]
  );

  const dueRecords = useMemo(() => rows.filter((f) => f.due > 0), [rows]);

  const { totalOutstanding, totalCollected, totalBilled } = useMemo(
    () => ({
      totalOutstanding: dueRecords.reduce((s, f) => s + f.due, 0),
      totalCollected: rows.reduce((s, f) => s + f.paid, 0),
      totalBilled: rows.reduce((s, f) => s + f.billed, 0),
    }),
    [dueRecords, rows]
  );

  const clearedCount = Math.max(rows.length - dueRecords.length, 0);

  const collectedPercent =
    totalBilled > 0
      ? Math.min(100, Math.round((totalCollected / totalBilled) * 100))
      : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? dueRecords.filter((f) =>
          [f.name, f.phone, f.village]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : dueRecords;
    return [...filtered].sort(SORTS[sortKey].fn);
  }, [dueRecords, query, sortKey]);

  const handleCollect = (f) => {
    navigate("/payments", {
      state: {
        farmerID: f._id,
        farmerName: f.name,
        dueAmount: f.due,
      },
    });
  };

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-rose-400/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-white/15">
              <AlertCircle size={13} />
              Due Summary
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
              Total outstanding
            </p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight text-rose-200 sm:text-6xl">
              {inr(totalOutstanding)}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              across {dueRecords.length} farmer{dueRecords.length === 1 ? "" : "s"} with
              pending dues
            </p>

            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-100/80">
                <span>Collected so far</span>
                <span className="text-emerald-300">{collectedPercent}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 transition-all duration-700"
                  style={{ width: `${collectedPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-emerald-100/60">
                {inr(totalCollected)} of {inr(totalBilled)} billed
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:col-span-2 lg:grid-cols-1">
            <HeroChip icon={Users} label="With due" value={dueRecords.length} />
            <HeroChip icon={CheckCircle2} label="Fully cleared" value={clearedCount} />
            <HeroChip icon={Wallet} label="Collected" value={inr(totalCollected)} />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <section className="flex flex-col gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-900/5 sm:flex-row sm:items-center sm:p-4">
        <div className="relative flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or village"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-10 text-sm font-medium text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative sm:w-48">
          <ArrowUpDown
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="Sort farmers"
            className="w-full appearance-none rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm font-semibold text-stone-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-stone-200/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={26} />
          </div>
          <p className="mt-4 font-bold text-stone-800">{error}</p>
          <button
            onClick={fetchFarmerRecords}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      ) : dueRecords.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 size={30} />
          </div>
          <h2 className="mt-5 text-lg font-extrabold text-stone-900">No dues pending</h2>
          <p className="mt-1 text-sm text-stone-500">
            All farmers are fully cleared right now.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
            <SearchX size={26} />
          </div>
          <p className="mt-4 font-bold text-stone-700">No farmers match &quot;{query}&quot;</p>
          <button
            onClick={() => setQuery("")}
            className="mt-3 text-sm font-semibold text-emerald-700 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <p className="px-1 text-sm font-semibold text-stone-500">
            Showing {visible.length} of {dueRecords.length} farmer
            {dueRecords.length === 1 ? "" : "s"}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((f) => {
              const paidPct =
                f.billed > 0
                  ? Math.min(100, Math.round((f.paid / f.billed) * 100))
                  : 0;

              return (
                <article
                  key={f._id}
                  className="group flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-900/5"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <Avatar name={f.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-stone-900">{f.name}</h3>
                        <div className="mt-1 space-y-0.5 text-xs text-stone-500">
                          {f.village && (
                            <p className="flex items-center gap-1.5">
                              <MapPin size={12} className="shrink-0 text-stone-400" />
                              <span className="truncate">{f.village}</span>
                            </p>
                          )}
                          {f.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone size={12} className="shrink-0 text-stone-400" />
                              {f.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                          Due
                        </p>
                        <p className="text-2xl font-extrabold tabular-nums text-rose-600">
                          {inr(f.due)}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {paidPct}% paid
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-400">
                      {inr(f.paid)} of {inr(f.billed)} billed
                    </p>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => handleCollect(f)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.97]"
                    >
                      <CreditCard size={15} />
                      Collect
                    </button>

                    {f.phone && (
                      <a
                        href={`tel:${f.phone}`}
                        aria-label={`Call ${f.name}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-stone-100 px-4 py-2.5 text-stone-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ parts ------------------------------ */

function HeroChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70">
        <Icon size={12} />
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  );
}