import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/UI/PageHeader";
import StatCard from "../../components/UI/StateCard";
import Card from "../../components/UI/Card";
import { AlertCircle, Users, CheckCircle2, IndianRupee, Wallet, Phone, MapPin } from "lucide-react";
import axios from "axios";
import { inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

// Deterministic soft gradient per farmer so avatars feel distinct but stable
// across re-renders, instead of a flat placeholder circle.
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

function Avatar({ name, size = "h-10 w-10 text-sm" }) {
  return (
    <div
      className={`${size} shrink-0 rounded-full bg-gradient-to-br ${avatarTheme(
        name
      )} flex items-center justify-center font-semibold text-white shadow-sm ring-2 ring-white`}
    >
      {initials(name)}
    </div>
  );
}

export default function DueSummary() {
  const [farmerRecords, setFarmerRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFarmerRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${API}/farmer/all-farmer`,
        {},
        { withCredentials: true }
      );

      setFarmerRecords(response.data?.farmers || []);
    } catch (err) {
      console.error("Error fetching farmer records:", err);
      setError("Failed to load due summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerRecords();
  }, []);

  const dueRecords = useMemo(() => {
    return farmerRecords.filter((f) => Number(f.totalDueAmount || 0) > 0);
  }, [farmerRecords]);

  const totalOutstanding = useMemo(() => {
    return dueRecords.reduce((sum, f) => sum + Number(f.totalDueAmount || 0), 0);
  }, [dueRecords]);

  const totalCollected = useMemo(() => {
    return farmerRecords.reduce((sum, f) => sum + Number(f.totalPaidAmount || 0), 0);
  }, [farmerRecords]);

  const totalBilled = useMemo(() => {
    return farmerRecords.reduce((sum, f) => sum + Number(f.totalBilledAmount || 0), 0);
  }, [farmerRecords]);

  return (
    <div className="space-y-5 sm:space-y-6 px-3 sm:px-0">
      <PageHeader
        title="Due Summary"
        subtitle="Track outstanding balances across all farmers"
      />

      {/* Stats grid: 1 col on mobile, 2 on small, 4 on xl */}
      <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          Icon={AlertCircle}
          label="Total Outstanding Due"
          value={inr(totalOutstanding)}
          tone="red"
        />
        <StatCard
          Icon={Users}
          label="Farmers with Due"
          value={dueRecords.length}
          tone="amber"
        />
        <StatCard
          Icon={CheckCircle2}
          label="Fully Cleared"
          value={Math.max(farmerRecords.length - dueRecords.length, 0)}
          tone="green"
        />
        <StatCard
          Icon={Wallet}
          label="Total Collected"
          value={inr(totalCollected)}
          tone="emerald"
        />
      </div>

      <Card className="p-0 overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-r from-red-50 via-white to-amber-50 px-4 sm:px-6 py-5 border-b border-slate-200">
          {/* soft decorative glow, purely cosmetic */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-red-200/30 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm ring-1 ring-red-100">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800">Due Farmers</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Only farmers with pending dues are shown below
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-600 border border-slate-200 shadow-sm self-start sm:self-auto">
              <IndianRupee size={16} className="text-red-500 shrink-0" />
              <span className="font-semibold text-slate-800">{inr(totalOutstanding)}</span>
              <span className="text-slate-400">outstanding</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 sm:p-14 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            <p className="text-sm">Loading due records…</p>
          </div>
        ) : error ? (
          <div className="p-8 sm:p-10 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchFarmerRecords}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : dueRecords.length === 0 ? (
          <div className="p-10 sm:p-14 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <CheckCircle2 size={26} />
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-slate-800">No dues pending</h4>
            <p className="text-sm text-slate-500 mt-1">
              All farmers are fully cleared right now.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: table view, hidden below md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
                    <th className="py-3.5 px-5 font-medium">Farmer</th>
                    <th className="py-3.5 px-5 font-medium">Phone</th>
                    <th className="py-3.5 px-5 font-medium">Village</th>
                    <th className="py-3.5 px-5 font-medium">Total Amount</th>
                    <th className="py-3.5 px-5 font-medium">Paid</th>
                    <th className="py-3.5 px-5 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {dueRecords.map((f) => {
                    const due = Number(f.totalDueAmount || 0);
                    const total = Number(f.totalBilledAmount || 0);
                    const paid = Number(f.totalPaidAmount || 0);
                    const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                    return (
                      <tr
                        key={f._id}
                        className="group border-b last:border-0 hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={f.name || "Unknown"} size="h-9 w-9 text-xs" />
                            <span className="font-medium text-slate-800">
                              {f.name || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500">{f.phone || "-"}</td>
                        <td className="py-3.5 px-5 text-slate-500">{f.village || "-"}</td>
                        <td className="py-3.5 px-5 text-slate-700">{inr(total)}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-medium">{inr(paid)}</span>
                            <div className="hidden lg:block h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600 ring-1 ring-red-100">
                            {inr(due)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked card list, shown below md */}
            <div className="md:hidden divide-y divide-slate-100">
              {dueRecords.map((f) => {
                const due = Number(f.totalDueAmount || 0);
                const total = Number(f.totalBilledAmount || 0);
                const paid = Number(f.totalPaidAmount || 0);
                const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <div key={f._id} className="p-4 active:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar name={f.name || "Unknown"} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">
                            {f.name || "Unknown"}
                          </p>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                            {f.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone size={12} className="shrink-0" />
                                {f.phone}
                              </span>
                            )}
                            {f.village && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={12} className="shrink-0" />
                                {f.village}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Due</p>
                        <p className="font-bold text-red-600">{inr(due)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400">Total Amount</p>
                          <p className="font-medium text-slate-700">{inr(total)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Paid</p>
                          <p className="font-medium text-emerald-600">{inr(paid)}</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}