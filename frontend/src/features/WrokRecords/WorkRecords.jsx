
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
  Trash2,
  Clock,
  Tractor,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  Filter,
  Pencil,
  Save,
  FileEdit,
  Landmark,
  TrendingUp,
  Receipt,
} from "lucide-react";

import PageHeader from "../../components/UI/PageHeader";
import { inr } from "../../data/mockData";
import { toast } from "react-hot-toast";

const PER_PAGE = 8;

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

const getPaymentStatus = (due, paid, total) => {
  if (due <= 0 && total > 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Due";
};

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateInputValue = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatMinutes = (minutes = 0) => {
  const total = Math.max(0, Math.floor(Number(minutes) || 0));

  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;

  return `${mins}m`;
};

const isActiveWork = (status) =>
  ["RUNNING", "PAUSED"].includes(
    String(status || "").toUpperCase()
  );

const getPercentage = (value, total) => {
  if (!total || total <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (Number(value || 0) / Number(total)) * 100)
  );
};

const statusStyles = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Partial: "bg-amber-50 text-amber-700 ring-amber-100",
  Due: "bg-rose-50 text-rose-700 ring-rose-100",
};

function StatusBadge({ status }) {
  const normalized = statusStyles[status] ? status : "Due";

  const Icon =
    normalized === "Paid"
      ? CheckCircle2
      : normalized === "Partial"
        ? Clock
        : AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[normalized]}`}
    >
      <Icon size={12} />
      {normalized}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="wr-stat rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-[11px] text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox size={26} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        No work records found
      </h3>

      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
        {hasFilters
          ? "Try changing your search or filters to find the work record."
          : "Your work records will appear here once you add work."}
      </p>

      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function FormField({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      {children}

      {hint && (
        <p className="mt-1 text-[10px] text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

function FinancialBreakdown({ work, compact = false }) {
  const directPaid = Number(work.directPaidAmount || 0);
  const advance = Number(work.advanceAppliedAmount || 0);
  const due = Number(work.dueAmount || 0);
  const total = Number(work.totalAmount || 0);

  const directPercent = getPercentage(directPaid, total);
  const advancePercent = getPercentage(advance, total);
  const duePercent = getPercentage(due, total);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-50 p-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            <Wallet size={11} />
            Direct
          </div>

          <p className="mt-1 break-words text-sm font-bold text-emerald-700">
            {inr(directPaid)}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
            <Landmark size={11} />
            Advance
          </div>

          <p className="mt-1 break-words text-sm font-bold text-blue-700">
            {inr(advance)}
          </p>
        </div>

        <div
          className={`rounded-xl p-2.5 ${
            due > 0 ? "bg-rose-50" : "bg-slate-50"
          }`}
        >
          <div
            className={`text-[10px] font-semibold uppercase tracking-wide ${
              due > 0 ? "text-rose-500" : "text-slate-400"
            }`}
          >
            Due
          </div>

          <p
            className={`mt-1 break-words text-sm font-bold ${
              due > 0 ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {inr(due)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
          <span>Payment breakdown</span>

          <span className="font-semibold text-slate-600">
            {Math.round(
              Math.min(100, directPercent + advancePercent)
            )}
            % settled
          </span>
        </div>

        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
          {directPercent > 0 && (
            <div
              style={{ width: `${directPercent}%` }}
              className="bg-emerald-500 transition-all"
            />
          )}

          {advancePercent > 0 && (
            <div
              style={{ width: `${advancePercent}%` }}
              className="bg-blue-500 transition-all"
            />
          )}

          {duePercent > 0 && (
            <div
              style={{ width: `${duePercent}%` }}
              className="bg-rose-400 transition-all"
            />
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Direct paid
          </span>

          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Advance adjusted
          </span>

          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Remaining due
          </span>
        </div>
      )}
    </div>
  );
}

export default function WorkRecords() {
  const [workRecords, setWorkRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  // EDIT STATE
  const [editingWork, setEditingWork] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editForm, setEditForm] = useState({
    date: "",
    fieldName: "",
    workType: "",
    totalMinutes: "",
    ratePerHour: "",
  });

  // ================= FETCH =================

  const fetchWorkRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(`${API}/work/all-works`, {
        withCredentials: true,
      });

      setWorkRecords(
        Array.isArray(data.works) ? data.works : []
      );
    } catch (err) {
      console.error("Fetch work records error:", err);

      setError(
        err.response?.data?.message ||
          "Couldn't load work records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkRecords();
  }, [fetchWorkRecords]);

  // ================= NORMALIZE =================

  const normalized = useMemo(() => {
    return workRecords.map((r) => {
      const totalAmount = Number(
        r.totalAmount ??
          r.amount ??
          (r.hours && r.ratePerHour
            ? r.hours * r.ratePerHour
            : 0)
      );

      // paidAmount contains direct payment + advance adjustment
      const totalPaidAmount = Number(
        r.paidAmount ?? r.paid ?? 0
      );

      const advanceAppliedAmount = Number(
        r.advanceAppliedAmount ?? 0
      );

      // Actual direct payment = total paid - advance applied
      const directPaidAmount = Math.max(
        0,
        totalPaidAmount - advanceAppliedAmount
      );

      const dueAmount = Number(
        r.dueAmount ??
          Math.max(0, totalAmount - totalPaidAmount)
      );

      const paymentStatus = getPaymentStatus(
        dueAmount,
        totalPaidAmount,
        totalAmount
      );

      return {
        ...r,
        farmerName:
          r.farmer?.name || r.fieldName || "Unknown Farmer",

        totalAmount,
        paidAmount: totalPaidAmount,
        directPaidAmount,
        advanceAppliedAmount,
        dueAmount,

        paymentStatus,
        workStatus: String(r.status || "UNKNOWN").toUpperCase(),
      };
    });
  }, [workRecords]);

  // ================= STATS =================

  const stats = useMemo(() => {
    return normalized.reduce(
      (acc, r) => {
        acc.records += 1;
        acc.totalAmount += r.totalAmount;
        acc.totalDirectPaid += r.directPaidAmount;
        acc.totalAdvanceAdjusted += r.advanceAppliedAmount;
        acc.totalDue += r.dueAmount;

        return acc;
      },
      {
        records: 0,
        totalAmount: 0,
        totalDirectPaid: 0,
        totalAdvanceAdjusted: 0,
        totalDue: 0,
      }
    );
  }, [normalized]);

  // ================= TYPES =================

  const typeOptions = useMemo(
    () =>
      [...new Set(
        normalized.map((r) => r.workType).filter(Boolean)
      )].sort(),
    [normalized]
  );

  // ================= FILTERS =================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return normalized.filter((r) => {
      const matchesSearch =
        !query ||
        (r.farmerName || "").toLowerCase().includes(query) ||
        (r.workType || "").toLowerCase().includes(query) ||
        (r.fieldName || "").toLowerCase().includes(query) ||
        (r._id || "").toLowerCase().includes(query);

      const matchesType =
        typeFilter === "all" || r.workType === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        r.paymentStatus.toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [normalized, search, typeFilter, statusFilter]);

  // ================= PAGINATION =================

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PER_PAGE)
  );

  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paged = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE
      ),
    [filtered, currentPage]
  );

  // ================= CLEAR FILTERS =================

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const hasFilters =
    Boolean(search.trim()) ||
    typeFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  // ================= EDIT WORK =================

  const openEditModal = (work) => {
    if (isActiveWork(work.workStatus)) {
      toast.error("Stop the work before editing it.");
      return;
    }

    setEditingWork(work);

    setEditForm({
      date: getDateInputValue(work.date),
      fieldName: work.fieldName || "",
      workType: work.workType || "",
      totalMinutes: String(work.totalMinutes ?? 0),
      ratePerHour: String(work.ratePerHour ?? 0),
    });
  };

  const closeEditModal = () => {
    if (savingEdit) return;

    setEditingWork(null);

    setEditForm({
      date: "",
      fieldName: "",
      workType: "",
      totalMinutes: "",
      ratePerHour: "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Auto calculate work amount
  const calculatedAmount = useMemo(() => {
    const minutes = Number(editForm.totalMinutes);
    const rate = Number(editForm.ratePerHour);

    if (
      !Number.isFinite(minutes) ||
      !Number.isFinite(rate) ||
      minutes < 0 ||
      rate < 0
    ) {
      return 0;
    }

    return Math.ceil((minutes / 60) * rate);
  }, [editForm.totalMinutes, editForm.ratePerHour]);

  const handleUpdateWork = async (e) => {
    e.preventDefault();

    if (!editingWork || savingEdit) return;

    const minutes = Number(editForm.totalMinutes);
    const rate = Number(editForm.ratePerHour);

    if (!editForm.date) {
      toast.error("Please select work date.");
      return;
    }

    if (!editForm.workType.trim()) {
      toast.error("Please enter work type.");
      return;
    }

    if (!Number.isFinite(minutes) || minutes < 0) {
      toast.error("Please enter a valid duration.");
      return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
      toast.error("Please enter a valid hourly rate.");
      return;
    }

    // Direct payment only is protected from reduction.
    // Previous advance will be restored by backend.
    const directPaid = Number(
      editingWork.directPaidAmount || 0
    );

    if (calculatedAmount < directPaid) {
      toast.error(
        `New amount cannot be less than direct payments already applied (${inr(
          directPaid
        )}).`
      );
      return;
    }

    const payload = {
      date: editForm.date,
      fieldName: editForm.fieldName.trim(),
      workType: editForm.workType.trim(),
      totalMinutes: minutes,
      ratePerHour: rate,
    };

    try {
      setSavingEdit(true);

      const { data } = await axios.put(
        `${API}/work/${editingWork._id}`,
        payload,
        {
          withCredentials: true,
        }
      );

      if (data.work) {
        setWorkRecords((prev) =>
          prev.map((record) =>
            record._id === editingWork._id
              ? {
                  ...record,
                  ...data.work,
                  farmer: data.work.farmer || record.farmer,
                }
              : record
          )
        );
      } else {
        await fetchWorkRecords();
      }

      const summary = data.summary;

      if (summary) {
        toast.success(
          `Work updated! Advance applied: ${inr(
            summary.newAdvanceApplied || 0
          )} | Remaining advance: ${inr(
            summary.remainingAdvance || 0
          )}`
        );
      } else {
        toast.success(
          data.message || "Work record updated successfully."
        );
      }

      setEditingWork(null);
    } catch (err) {
      console.error("Update work error:", err);

      toast.error(
        err.response?.data?.message ||
          "Failed to update work record."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // ================= DELETE WORK =================

  const handleDeleteWork = async (work) => {
    if (deletingId) return;

    const active = isActiveWork(work.workStatus);

    if (active) {
      toast.error(
        "Running or paused work cannot be deleted. Stop it first."
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Delete this work record?\n\nFarmer: ${
        work.farmerName
      }\nWork: ${work.workType || "General"}\nAmount: ${inr(
        work.totalAmount
      )}\nDirect Paid: ${inr(
        work.directPaidAmount
      )}\nAdvance Adjusted: ${inr(
        work.advanceAppliedAmount
      )}\nDue: ${inr(
        work.dueAmount
      )}\n\nThis will permanently delete the work and its linked payment records. Applied advance will be restored/reconciled where possible.\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(work._id);

      await axios.delete(`${API}/work/${work._id}`, {
        withCredentials: true,
      });

      setWorkRecords((prev) =>
        prev.filter((record) => record._id !== work._id)
      );

      toast.success("Work and linked payments deleted");
    } catch (err) {
      console.error("Delete work error:", err);

      toast.error(
        err.response?.data?.message ||
          "Failed to delete work record"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="wr-root min-w-0 space-y-5 pb-6">
      <style>{`
        @keyframes wrFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .wr-enter {
          animation: wrFade .3s ease both;
        }

        .wr-stat {
          transition: transform .2s ease, box-shadow .2s ease;
        }

        @media (hover: hover) {
          .wr-stat:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
          }
        }

        .wr-focus:focus-within {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,.1);
        }

        .wr-action {
          transition: all .15s ease;
        }

        .wr-action:active:not(:disabled) {
          transform: scale(.97);
        }

        @media (prefers-reduced-motion: reduce) {
          .wr-enter { animation: none; }
          .wr-stat, .wr-action { transition: none; }
        }
      `}</style>

      {/* HEADER */}
      <PageHeader
        title="Work Records"
        subtitle="Track completed work, direct payments, advance adjustments and outstanding dues"
      />

      {/* SUMMARY STATS */}
      <div className="wr-enter grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          title="Total Records"
          value={stats.records}
          subtitle="All work entries"
          icon={Tractor}
          iconClass="bg-slate-100 text-slate-600"
        />

        <StatCard
          title="Total Work Amount"
          value={inr(stats.totalAmount)}
          subtitle="Overall billed amount"
          icon={IndianRupee}
          iconClass="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Direct Received"
          value={inr(stats.totalDirectPaid)}
          subtitle="Actual payments received"
          icon={Wallet}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Advance Adjusted"
          value={inr(stats.totalAdvanceAdjusted)}
          subtitle="Previous advance consumed"
          icon={Landmark}
          iconClass="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Outstanding Due"
          value={inr(stats.totalDue)}
          subtitle="Remaining collection"
          icon={AlertCircle}
          iconClass="bg-rose-50 text-rose-600"
        />
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="wr-enter rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Collection Overview
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              How your total work amount is settled
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <TrendingUp size={17} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Billed
            </p>
            <p className="mt-1 text-base font-bold text-slate-800">
              {inr(stats.totalAmount)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Direct Paid
            </p>
            <p className="mt-1 text-base font-bold text-emerald-700">
              {inr(stats.totalDirectPaid)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              Advance Used
            </p>
            <p className="mt-1 text-base font-bold text-blue-700">
              {inr(stats.totalAdvanceAdjusted)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">
              Remaining Due
            </p>
            <p className="mt-1 text-base font-bold text-rose-600">
              {inr(stats.totalDue)}
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="wr-enter rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="wr-focus flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search size={16} className="shrink-0 text-slate-400" />

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search farmer, work type, field or ID..."
              className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className={`wr-action flex flex-1 items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium sm:flex-none ${
                filtersOpen || activeFilterCount
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters

              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={fetchWorkRecords}
              disabled={loading}
              className="wr-action flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="Refresh records"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* FILTER PANEL */}
        {filtersOpen && (
          <div className="wr-enter mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Work Type
              </label>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="all">All types</option>

                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Payment Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="all">All payment statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="due">Due</option>
              </select>
            </div>

            {hasFilters && (
              <div className="flex justify-end sm:col-span-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="wr-action inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800"
                >
                  <X size={13} />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ACTIVE FILTER CHIPS */}
        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Active:
            </span>

            {search.trim() && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                Search: {search}
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {typeFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {typeFilter}
                <button
                  onClick={() => setTypeFilter("all")}
                  aria-label="Clear type filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">
                {statusFilter}
                <button
                  onClick={() => setStatusFilter("all")}
                  aria-label="Clear status filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* RECORDS CONTAINER */}
      <div className="wr-enter overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Work History
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {filtered.length}{" "}
              {filtered.length === 1 ? "record" : "records"} found
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter size={13} />
            <span>
              {typeFilter === "all" ? "All work types" : typeFilter}
            </span>
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-slate-400">
            <Loader2
              size={26}
              className="animate-spin text-emerald-600"
            />
            <p className="mt-3 text-sm">
              Loading work records...
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
            <AlertCircle size={26} className="text-rose-400" />

            <p className="mt-3 max-w-sm text-sm text-rose-500">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchWorkRecords}
              className="wr-action mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : paged.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onClear={clearFilters}
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1250px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Farmer / Work</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Duration</th>
                    <th className="px-4 py-3.5">Total Amount</th>
                    <th className="px-4 py-3.5">Direct Paid</th>
                    <th className="px-4 py-3.5">Advance Adjusted</th>
                    <th className="px-4 py-3.5">Due</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paged.map((r) => {
                    const active = isActiveWork(r.workStatus);

                    return (
                      <tr
                        key={r._id}
                        className="group transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">
                            {r.farmerName}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <Tractor size={12} />
                            {r.workType || "General"}

                            {r.fieldName && (
                              <>
                                <span>·</span>
                                <span className="max-w-[150px] truncate">
                                  {r.fieldName}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {formatDate(r.date)}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {formatMinutes(r.totalMinutes)}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {inr(r.totalAmount)}
                        </td>

                        <td className="px-4 py-4 font-semibold text-emerald-600">
                          {inr(r.directPaidAmount)}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600">
                            <Landmark size={13} />
                            {inr(r.advanceAppliedAmount)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`font-semibold ${
                              r.dueAmount > 0
                                ? "text-rose-600"
                                : "text-slate-400"
                            }`}
                          >
                            {inr(r.dueAmount)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={r.paymentStatus} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              disabled={
                                active ||
                                deletingId !== null ||
                                savingEdit
                              }
                              title={
                                active
                                  ? "Stop this work before editing"
                                  : "Edit work record"
                              }
                              className="wr-action inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-white px-2.5 py-2 text-xs font-medium text-blue-600 hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWork(r)}
                              disabled={
                                deletingId !== null ||
                                active ||
                                savingEdit
                              }
                              title={
                                active
                                  ? "Stop this work before deleting"
                                  : "Delete work and linked payments"
                              }
                              className="wr-action inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-white px-2.5 py-2 text-xs font-medium text-rose-600 hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingId === r._id ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={13} />
                              )}

                              {deletingId === r._id
                                ? "Deleting"
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TABLET / MOBILE CARDS */}
            <div className="space-y-3 p-3 sm:p-4 lg:hidden">
              {paged.map((r) => {
                const active = isActiveWork(r.workStatus);

                return (
                  <div
                    key={r._id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 transition-shadow hover:shadow-sm sm:p-4"
                  >
                    {/* TOP */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {r.farmerName}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(r.date)}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {formatMinutes(r.totalMinutes)}
                          </span>
                        </div>
                      </div>

                      <StatusBadge status={r.paymentStatus} />
                    </div>

                    {/* WORK INFO */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <Tractor size={12} />
                        {r.workType || "General"}
                      </span>

                      {r.fieldName && (
                        <span className="max-w-full truncate rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                          {r.fieldName}
                        </span>
                      )}
                    </div>

                    {/* TOTAL AMOUNT */}
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500">
                          <Receipt size={15} />
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Total Work Amount
                          </p>
                          <p className="text-xs text-slate-500">
                            Billed amount
                          </p>
                        </div>
                      </div>

                      <p className="text-lg font-extrabold text-slate-800">
                        {inr(r.totalAmount)}
                      </p>
                    </div>

                    {/* FINANCIAL BREAKDOWN */}
                    <div className="mt-3">
                      <FinancialBreakdown work={r} />
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        disabled={
                          active ||
                          deletingId !== null ||
                          savingEdit
                        }
                        className="wr-action flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={14} />
                        Edit Work
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteWork(r)}
                        disabled={
                          deletingId !== null ||
                          active ||
                          savingEdit
                        }
                        className="wr-action flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === r._id ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={14} />
                        )}

                        {active
                          ? "Stop before deleting"
                          : deletingId === r._id
                            ? "Deleting..."
                            : "Delete Work"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && !error && filtered.length > 0 && (
        <div className="wr-enter flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {(currentPage - 1) * PER_PAGE + 1}
            </span>
            {" – "}
            <span className="font-semibold text-slate-600">
              {Math.min(
                currentPage * PER_PAGE,
                filtered.length
              )}
            </span>
            {" of "}
            <span className="font-semibold text-slate-600">
              {filtered.length}
            </span>
            {" records"}
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentPage === 1}
              className="wr-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((prev) =>
                  Math.min(totalPages, prev + 1)
                )
              }
              disabled={currentPage === totalPages}
              className="wr-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editingWork && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <div className="wr-enter my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileEdit size={19} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Edit Work Record
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Update work details and recalculate advance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Close edit modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateWork}>
              <div className="space-y-4 p-4 sm:p-5">
                {/* FARMER */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Farmer
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {editingWork.farmerName}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Work ID: {editingWork._id}
                  </p>
                </div>

                {/* INPUTS */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Work Date">
                    <input
                      type="date"
                      name="date"
                      value={editForm.date}
                      onChange={handleEditChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Work Type">
                    <input
                      type="text"
                      name="workType"
                      value={editForm.workType}
                      onChange={handleEditChange}
                      placeholder="e.g. Haal, Tractor"
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField label="Field Name">
                      <input
                        type="text"
                        name="fieldName"
                        value={editForm.fieldName}
                        onChange={handleEditChange}
                        placeholder="Enter field name"
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Duration (Minutes)"
                    hint="Example: 90 minutes = 1 hour 30 minutes"
                  >
                    <input
                      type="number"
                      name="totalMinutes"
                      min="0"
                      step="0.01"
                      value={editForm.totalMinutes}
                      onChange={handleEditChange}
                      required
                      className={inputClass}
                    />

                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {formatMinutes(editForm.totalMinutes)}
                    </p>
                  </FormField>

                  <FormField label="Rate Per Hour (₹)">
                    <input
                      type="number"
                      name="ratePerHour"
                      min="0"
                      step="0.01"
                      value={editForm.ratePerHour}
                      onChange={handleEditChange}
                      required
                      className={inputClass}
                    />
                  </FormField>
                </div>

                {/* NEW AMOUNT */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">
                        Updated Work Amount
                      </p>

                      <p className="mt-1 text-[10px] text-emerald-600">
                        Rounded up to the next rupee
                      </p>
                    </div>

                    <p className="text-xl font-extrabold tracking-tight text-emerald-800">
                      {inr(calculatedAmount)}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-emerald-100 pt-3 text-[11px] text-emerald-700">
                    Calculation: ({Number(editForm.totalMinutes || 0)} ÷
                    60) × ₹
                    {Number(editForm.ratePerHour || 0).toLocaleString(
                      "en-IN"
                    )}
                  </div>
                </div>

                {/* EXISTING PAYMENT BREAKDOWN */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">
                      Current Payment Breakdown
                    </p>

                    <StatusBadge status={editingWork.paymentStatus} />
                  </div>

                  <FinancialBreakdown work={editingWork} />

                  <p className="mt-2 text-[10px] leading-5 text-slate-400">
                    Direct paid amount remains unchanged. Previous advance
                    will be restored and recalculated by the backend.
                  </p>
                </div>

                {/* WARNING */}
                <div className="flex gap-2.5 rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <p className="text-xs font-semibold text-amber-800">
                      Advance will be recalculated
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-700">
                      On saving, the backend will restore this work's
                      previous advance allocations and apply available
                      farmer advance again according to the updated
                      amount. Direct payments will remain unchanged.
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="wr-action rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="wr-action inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
