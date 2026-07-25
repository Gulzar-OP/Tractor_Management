import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  SlidersHorizontal,
  X,
  Calendar,
  Clock,
} from "lucide-react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import { inr } from "../../data/mockData";

const PER_PAGE = 8;
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function WorkRecords() {
  const [workRecords, setWorkRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchWorkRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(
        `${API}/work/all-works`,
        {}, // request body
        {
          withCredentials: true,
        }
      );
      setWorkRecords(Array.isArray(data.works) ? data.works : []);
    } catch (err) {
      console.error("Error fetching work records:", err);
      setError("Couldn't load work records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkRecords();
  }, [fetchWorkRecords]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatus = (due, paid, total) => {
    if (due > 0) return "Due";
    if (total > 0 && paid >= total) return "Paid";
    return "Partial";
  };

  // Normalize once so every downstream calculation uses consistent numbers
  const normalized = useMemo(() => {
    return workRecords.map((r) => {
      const totalAmount = r.totalAmount ?? r.amount ?? (r.hours && r.ratePerHour ? r.hours * r.ratePerHour : 0);
      const paidAmount = r.paidAmount ?? r.paid ?? 0;
      const dueAmount = r.dueAmount ?? Math.max(0, totalAmount - paidAmount);
      return {
        ...r,
        farmerName: r.farmer?.name || r.fieldName || "Unknown",
        totalAmount,
        paidAmount,
        dueAmount,
        status: r.status || getStatus(dueAmount, paidAmount, totalAmount),
      };
    });
  }, [workRecords]);

  const typeOptions = useMemo(
    () => [...new Set(normalized.map((r) => r.workType).filter(Boolean))],
    [normalized]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return normalized.filter((r) => {
      const matchesSearch =
        !query ||
        r.farmerName.toLowerCase().includes(query) ||
        (r.workType || "").toLowerCase().includes(query) ||
        (r._id || "").toLowerCase().includes(query);

      const matchesType = typeFilter === "all" || r.workType === typeFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [normalized, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const resetPage = () => setPage(1);

  const activeFilterCount = (typeFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    resetPage();
  };

  return (
    <div className="wr-root px-3 sm:px-0">
      <style>{`
        @keyframes wrFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wrSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes wrSlideDown {
          from { opacity: 0; transform: translateY(-6px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 200px; }
        }
        .wr-fade-in {
          animation: wrFadeUp 0.35s ease both;
        }
        .wr-row {
          animation: wrFadeUp 0.3s ease both;
        }
        .wr-card {
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        .wr-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .wr-input:focus-within {
          border-color: #1F5D3B;
          box-shadow: 0 0 0 3px rgba(31, 93, 59, 0.12);
        }
        .wr-btn {
          transition: background-color 0.18s ease, color 0.18s ease, transform 0.12s ease, opacity 0.18s ease;
        }
        .wr-btn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .wr-action-btn {
          transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        .wr-tr {
          transition: background-color 0.18s ease;
        }
        .wr-pill {
          transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
        }
        .wr-mobile-filters {
          animation: wrSlideDown 0.22s ease both;
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .wr-fade-in, .wr-row, .wr-mobile-filters { animation: none; }
        }
      `}</style>

      <PageHeader title="Work Records" subtitle="All past and current work records" />

      {/* Filter bar */}
      <div className="mb-5 wr-fade-in">
        {/* Search + mobile filter toggle */}
        <div className="flex items-center gap-2">
          <label className="wr-input flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white flex-1 min-w-0">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search farmer, type or id"
              className="w-full min-w-0 outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  resetPage();
                }}
                className="shrink-0 text-slate-300 hover:text-slate-500"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="wr-btn sm:hidden relative shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={17} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-semibold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Type / status selects: hidden on mobile until toggled, always visible from sm up */}
        <div
          className={`${
            filtersOpen ? "grid" : "hidden"
          } sm:grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 wr-mobile-filters sm:animate-none`}
        >
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              resetPage();
            }}
            className="wr-input px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none"
          >
            <option value="all">All types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
            className="wr-input px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none"
          >
            <option value="all">All status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Due">Due</option>
          </select>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <Card className="wr-card p-3 sm:p-5 hover:shadow-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 wr-fade-in">
            <Loader2 size={26} className="mb-3" style={{ animation: "wrSpin 0.8s linear infinite" }} />
            <p className="text-sm">Loading work records…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center wr-fade-in">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchWorkRecords}
              className="wr-btn text-xs font-medium px-4 py-2 rounded-full bg-slate-800 text-white hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center wr-fade-in">
            <Inbox size={28} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No work records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
                    <th className="py-3.5 font-medium">Farmer</th>
                    <th className="py-3.5 font-medium">Date</th>
                    <th className="py-3.5 font-medium">Type</th>
                    <th className="py-3.5 font-medium">Minutes</th>
                    <th className="py-3.5 font-medium">Amount</th>
                    <th className="py-3.5 font-medium">Paid</th>
                    <th className="py-3.5 font-medium">Due</th>
                    <th className="py-3.5 font-medium">Payment Status</th>
                    <th className="py-3.5 font-medium text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paged.map((r, i) => (
                    <tr
                      key={r._id || i}
                      className="wr-row wr-tr border-b last:border-0 hover:bg-slate-50"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <td className="py-3.5 font-medium text-slate-700">{r.farmerName}</td>
                      <td className="py-3.5 text-slate-500">{formatDate(r.date)}</td>
                      <td className="py-3.5 text-slate-500">{r.workType || "-"}</td>
                      <td className="py-3.5 text-slate-500">{r.totalMinutes ?? "-"}</td>
                      <td className="py-3.5 text-slate-800">{inr(r.totalAmount)}</td>
                      <td className="py-3.5 text-emerald-600">{inr(r.paidAmount)}</td>
                      <td className={`py-3.5 font-bold ${r.dueAmount > 0 ? "text-red-500" : "text-slate-400"}`}>
                        {inr(r.dueAmount)}
                      </td>
                      <td className="py-3.5">
                        <Badge status={r.status} />
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <button className="wr-action-btn text-xs font-medium text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 hover:bg-emerald-50">
                          View
                        </button>
                        <button className="wr-action-btn text-xs font-medium text-slate-500 ml-2 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list view */}
            <div className="md:hidden flex flex-col gap-3">
              {paged.map((r, i) => (
                <div
                  key={r._id || i}
                  className="wr-row rounded-xl border border-slate-100 p-3.5"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{r.farmerName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(r.date)}
                        </span>
                        {r.totalMinutes != null && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {r.totalMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge status={r.status} />
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-500">
                      {r.workType || "-"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Amount</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{inr(r.totalAmount)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-500">Paid</p>
                      <p className="text-sm font-semibold text-emerald-700 mt-0.5">{inr(r.paidAmount)}</p>
                    </div>
                    <div className={`rounded-lg py-2 ${r.dueAmount > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                      <p className={`text-[10px] uppercase tracking-wide ${r.dueAmount > 0 ? "text-red-400" : "text-slate-400"}`}>
                        Due
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 ${r.dueAmount > 0 ? "text-red-500" : "text-slate-400"}`}>
                        {inr(r.dueAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button className="wr-action-btn flex-1 text-xs font-medium text-emerald-600 px-3 py-2 rounded-full border border-emerald-100 hover:bg-emerald-50">
                      View
                    </button>
                    <button className="wr-action-btn flex-1 text-xs font-medium text-slate-500 px-3 py-2 rounded-full border border-slate-200 hover:bg-slate-50">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 wr-fade-in">
          <p className="text-xs text-slate-400 order-2 sm:order-1">
            Showing <span className="font-medium text-slate-600">{(currentPage - 1) * PER_PAGE + 1}</span>–
            <span className="font-medium text-slate-600">{Math.min(currentPage * PER_PAGE, filtered.length)}</span> of{" "}
            <span className="font-medium text-slate-600">{filtered.length}</span>
          </p>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="wr-btn flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft size={15} /> <span className="hidden xs:inline">Prev</span>
            </button>
            <div className="text-sm text-slate-500 px-1 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="wr-btn flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <span className="hidden xs:inline">Next</span> <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}