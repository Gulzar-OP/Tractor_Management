import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
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
  Pencil,
  Save,
  FileEdit,
  Landmark,
  Receipt,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { inr } from "../../data/mockData";
import { toast } from "react-hot-toast";

const PER_PAGE = 8;

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

// A work with nothing left to collect is "Paid" (this includes zero-amount works,
// which used to be shown as "Due").
const getPaymentStatus = (due, paid) => {
  if (due <= 0) return "Paid";
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  ["RUNNING", "PAUSED"].includes(String(status || "").toUpperCase());

const getPercentage = (value, total) => {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (Number(value || 0) / Number(total)) * 100));
};

const initials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

const PAY_STYLES = {
  Paid: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500", icon: CheckCircle2 },
  Partial: { cls: "bg-amber-50 text-amber-700 ring-amber-200", bar: "bg-amber-400", icon: Clock },
  Due: { cls: "bg-rose-50 text-rose-700 ring-rose-200", bar: "bg-rose-500", icon: AlertCircle },
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "due", label: "Due" },
];

const fieldCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60";

/* ------------------------------ small parts ------------------------------ */

function StatusBadge({ status }) {
  const s = PAY_STYLES[status] || PAY_STYLES.Due;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${s.cls}`}
    >
      <Icon size={12} />
      {PAY_STYLES[status] ? status : "Due"}
    </span>
  );
}

function WorkStatusBadge({ status }) {
  const map = {
    RUNNING: { label: "Running", cls: "bg-emerald-100 text-emerald-700", pulse: true },
    PAUSED: { label: "Paused", cls: "bg-amber-100 text-amber-700" },
    CANCELLED: { label: "Cancelled", cls: "bg-stone-200 text-stone-600" },
  };
  const m = map[status];
  if (!m) return null; // finished works need no badge
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.cls}`}>
      {m.pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
      {m.label}
    </span>
  );
}

function HeroChip({ icon: Icon, label, value, valueCls = "" }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70">
        <Icon size={12} />
        {label}
      </p>
      <p className={`mt-1 truncate text-lg font-extrabold tabular-nums ${valueCls}`}>{value}</p>
    </div>
  );
}

// Direct paid / advance adjusted / due, as a stacked bar with figures
function Breakdown({ work, showLegend = false }) {
  const direct = Number(work.directPaidAmount || 0);
  const advance = Number(work.advanceAppliedAmount || 0);
  const due = Number(work.dueAmount || 0);
  const total = Number(work.totalAmount || 0);

  const directPct = getPercentage(direct, total);
  const advancePct = Math.min(100 - directPct, getPercentage(advance, total));
  const duePct = Math.min(100 - directPct - advancePct, getPercentage(due, total));

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 px-2 py-2">
          <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
            <Wallet size={10} />
            Direct
          </p>
          <p className="mt-0.5 break-words text-xs font-extrabold tabular-nums text-emerald-700">
            {inr(direct)}
          </p>
        </div>
        <div className="rounded-xl bg-sky-50 px-2 py-2">
          <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-sky-600">
            <Landmark size={10} />
            Advance
          </p>
          <p className="mt-0.5 break-words text-xs font-extrabold tabular-nums text-sky-700">
            {inr(advance)}
          </p>
        </div>
        <div className={`rounded-xl px-2 py-2 ${due > 0 ? "bg-rose-50" : "bg-stone-50"}`}>
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${
              due > 0 ? "text-rose-500" : "text-stone-400"
            }`}
          >
            Due
          </p>
          <p
            className={`mt-0.5 break-words text-xs font-extrabold tabular-nums ${
              due > 0 ? "text-rose-600" : "text-stone-400"
            }`}
          >
            {inr(due)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-stone-100">
        {directPct > 0 && <div style={{ width: `${directPct}%` }} className="bg-emerald-500" />}
        {advancePct > 0 && <div style={{ width: `${advancePct}%` }} className="bg-sky-500" />}
        {duePct > 0 && <div style={{ width: `${duePct}%` }} className="bg-rose-400" />}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
        <span>Payment breakdown</span>
        <span className="font-bold text-stone-600">
          {Math.round(Math.min(100, directPct + advancePct))}% settled
        </span>
      </div>

      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Direct paid
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Advance adjusted
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Remaining due
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function WorkRecords() {
  const [workRecords, setWorkRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [editingWork, setEditingWork] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    date: "",
    fieldName: "",
    workType: "",
    totalMinutes: "",
    ratePerHour: "",
  });

  /* ---------------- fetch ---------------- */

  // silent = refresh in the background without replacing the list with a spinner
  const fetchWorkRecords = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(`${API}/work/all-works`, {
        withCredentials: true,
      });
      setWorkRecords(Array.isArray(data.works) ? data.works : []);
    } catch (err) {
      console.error("Fetch work records error:", err);
      const message =
        err.response?.data?.message || "Couldn't load work records. Please try again.";
      if (silent) toast.error(message);
      else setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkRecords();
  }, [fetchWorkRecords]);

  /* ---------------- normalize ---------------- */

  const normalized = useMemo(() => {
    return workRecords
      .map((r) => {
        const totalAmount = Number(
          r.totalAmount ?? r.amount ?? (r.hours && r.ratePerHour ? r.hours * r.ratePerHour : 0)
        );

        // paidAmount = direct payments + advance adjustment
        const totalPaidAmount = Number(r.paidAmount ?? r.paid ?? 0);
        const advanceAppliedAmount = Number(r.advanceAppliedAmount ?? 0);
        const directPaidAmount = Math.max(0, totalPaidAmount - advanceAppliedAmount);
        const dueAmount = Number(r.dueAmount ?? Math.max(0, totalAmount - totalPaidAmount));

        return {
          ...r,
          // Don't use the field name as a stand-in for the farmer's name
          farmerName: r.farmer?.name || "Unknown Farmer",
          totalAmount,
          paidAmount: totalPaidAmount,
          directPaidAmount,
          advanceAppliedAmount,
          dueAmount,
          paymentStatus: getPaymentStatus(dueAmount, totalPaidAmount),
          workStatus: String(r.status || "UNKNOWN").toUpperCase(),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest first
  }, [workRecords]);

  /* ---------------- stats (cancelled works don't count) ---------------- */

  const stats = useMemo(() => {
    const s = normalized.reduce(
      (acc, r) => {
        if (r.workStatus === "CANCELLED") return acc;
        acc.records += 1;
        acc.totalAmount += r.totalAmount;
        acc.totalDirectPaid += r.directPaidAmount;
        acc.totalAdvanceAdjusted += r.advanceAppliedAmount;
        acc.totalDue += r.dueAmount;
        return acc;
      },
      { records: 0, totalAmount: 0, totalDirectPaid: 0, totalAdvanceAdjusted: 0, totalDue: 0 }
    );
    s.settledPct = Math.round(
      getPercentage(s.totalDirectPaid + s.totalAdvanceAdjusted, s.totalAmount)
    );
    return s;
  }, [normalized]);

  const typeOptions = useMemo(
    () => [...new Set(normalized.map((r) => r.workType).filter(Boolean))].sort(),
    [normalized]
  );

  const statusCounts = useMemo(() => {
    const c = { all: normalized.length, paid: 0, partial: 0, due: 0 };
    normalized.forEach((r) => {
      c[r.paymentStatus.toLowerCase()] += 1;
    });
    return c;
  }, [normalized]);

  /* ---------------- filters + pagination ---------------- */

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return normalized.filter((r) => {
      const matchesSearch =
        !query ||
        (r.farmerName || "").toLowerCase().includes(query) ||
        (r.workType || "").toLowerCase().includes(query) ||
        (r.fieldName || "").toLowerCase().includes(query) ||
        (r._id || "").toLowerCase().includes(query);

      const matchesType = typeFilter === "all" || r.workType === typeFilter;
      const matchesStatus =
        statusFilter === "all" || r.paymentStatus.toLowerCase() === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [normalized, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [filtered, currentPage]
  );

  const hasFilters = Boolean(search.trim()) || typeFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  /* ---------------- edit ---------------- */

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

  const closeEditModal = useCallback(() => {
    if (savingEdit) return;
    setEditingWork(null);
    setEditForm({ date: "", fieldName: "", workType: "", totalMinutes: "", ratePerHour: "" });
  }, [savingEdit]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const calculatedAmount = useMemo(() => {
    const minutes = Number(editForm.totalMinutes);
    const rate = Number(editForm.ratePerHour);
    if (!Number.isFinite(minutes) || !Number.isFinite(rate) || minutes < 0 || rate < 0) return 0;
    return Math.ceil((minutes / 60) * rate);
  }, [editForm.totalMinutes, editForm.ratePerHour]);

  const handleUpdateWork = async (e) => {
    e.preventDefault();
    if (!editingWork || savingEdit) return;

    const minutes = Number(editForm.totalMinutes);
    const rate = Number(editForm.ratePerHour);

    if (!editForm.date) return toast.error("Please select work date.");
    if (!editForm.workType.trim()) return toast.error("Please enter work type.");
    if (!Number.isFinite(minutes) || minutes < 0) return toast.error("Please enter a valid duration.");
    if (!Number.isFinite(rate) || rate < 0) return toast.error("Please enter a valid hourly rate.");

    // Direct payments are protected from reduction; advance is restored by the backend
    const directPaid = Number(editingWork.directPaidAmount || 0);
    if (calculatedAmount < directPaid) {
      return toast.error(
        `New amount cannot be less than direct payments already applied (${inr(directPaid)}).`
      );
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

      const { data } = await axios.put(`${API}/work/${editingWork._id}`, payload, {
        withCredentials: true,
      });

      const summary = data.summary;
      toast.success(
        summary
          ? `Work updated! Advance applied: ${inr(summary.newAdvanceApplied || 0)} | Remaining advance: ${inr(
              summary.remainingAdvance || 0
            )}`
          : data.message || "Work record updated successfully."
      );

      setSavingEdit(false);
      setEditingWork(null);

      // Advance is recalculated server-side, so always reload the real figures
      await fetchWorkRecords(true);
    } catch (err) {
      console.error("Update work error:", err);
      toast.error(err.response?.data?.message || "Failed to update work record.");
    } finally {
      setSavingEdit(false);
    }
  };

  /* ---------------- delete ---------------- */

  const askDelete = (work) => {
    if (deletingId) return;
    if (isActiveWork(work.workStatus)) {
      toast.error("Running or paused work cannot be deleted. Stop it first.");
      return;
    }
    setDeleteTarget(work);
  };

  const confirmDelete = async () => {
    const work = deleteTarget;
    if (!work) return;

    try {
      setDeletingId(work._id);
      await axios.delete(`${API}/work/${work._id}`, { withCredentials: true });
      setWorkRecords((prev) => prev.filter((record) => record._id !== work._id));
      setDeleteTarget(null);
      toast.success("Work and linked payments deleted");
    } catch (err) {
      console.error("Delete work error:", err);
      toast.error(err.response?.data?.message || "Failed to delete work record");
    } finally {
      setDeletingId(null);
    }
  };

  // Escape closes whichever modal is open
  useEffect(() => {
    if (!editingWork && !deleteTarget) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (deleteTarget && !deletingId) setDeleteTarget(null);
      else closeEditModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingWork, deleteTarget, deletingId, closeEditModal]);

  /* ---------------- render ---------------- */

  const busy = deletingId !== null || savingEdit;

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 pb-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-white/15">
              <ClipboardList size={13} />
              Work Records
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
              Total billed
            </p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl">
              {inr(stats.totalAmount)}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              {stats.records} work{stats.records === 1 ? "" : "s"} · {stats.settledPct}% settled
            </p>

            <div className="mt-4 h-2.5 max-w-sm overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 transition-all duration-700"
                style={{ width: `${stats.settledPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-3">
            <HeroChip icon={Wallet} label="Direct received" value={inr(stats.totalDirectPaid)} />
            <HeroChip icon={Landmark} label="Advance adjusted" value={inr(stats.totalAdvanceAdjusted)} />
            <HeroChip
              icon={AlertCircle}
              label="Outstanding due"
              value={inr(stats.totalDue)}
              valueCls="text-rose-200"
            />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <section className="space-y-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-900/5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search farmer, work type, field or ID"
              className={`${fieldCls} pl-11 pr-10`}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition hover:bg-stone-200"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="relative sm:w-48">
            <Tractor
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by work type"
              className={`${fieldCls} appearance-none pl-10 pr-9`}
            >
              <option value="all">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchWorkRecords(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing || loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setStatusFilter(f.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    active ? "bg-white/25" : "bg-white text-stone-500"
                  }`}
                >
                  {statusCounts[f.id]}
                </span>
              </button>
            );
          })}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
            >
              <X size={13} />
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Records */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Work History</h2>
            <p className="text-xs text-stone-400">
              {filtered.length} {filtered.length === 1 ? "record" : "records"} found · newest first
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : error ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertCircle size={26} />
            </div>
            <p className="mt-3 max-w-sm text-sm font-bold text-stone-800">{error}</p>
            <button
              type="button"
              onClick={() => fetchWorkRecords()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
              <Inbox size={28} />
            </div>
            <h3 className="mt-4 font-bold text-stone-700">No work records found</h3>
            <p className="mt-1 max-w-xs text-sm text-stone-400">
              {hasFilters
                ? "Try changing your search or filters."
                : "Your work records will appear here once you add work."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm font-bold text-emerald-700 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {paged.map((r) => {
              const active = isActiveWork(r.workStatus);
              const cancelled = r.workStatus === "CANCELLED";
              const stripe = (PAY_STYLES[r.paymentStatus] || PAY_STYLES.Due).bar;

              return (
                <li
                  key={r._id}
                  className={`relative grid gap-4 p-5 pl-6 transition hover:bg-emerald-50/30 sm:p-6 sm:pl-7 lg:grid-cols-12 lg:items-center ${
                    cancelled ? "opacity-60" : ""
                  }`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${cancelled ? "bg-stone-300" : stripe}`} />

                  {/* Farmer + work */}
                  <div className="flex min-w-0 items-start gap-3 lg:col-span-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-bold text-white shadow-md">
                      {initials(r.farmerName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-stone-900">{r.farmerName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500">
                        <Tractor size={12} className="text-stone-400" />
                        {r.workType || "General"}
                        {r.fieldName && <span className="truncate">· {r.fieldName}</span>}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(r.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {formatMinutes(r.totalMinutes)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="lg:col-span-3">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                      <Receipt size={11} />
                      Work amount
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold tabular-nums text-stone-900">
                      {inr(r.totalAmount)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.paymentStatus} />
                      <WorkStatusBadge status={r.workStatus} />
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="lg:col-span-3">
                    <Breakdown work={r} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 lg:col-span-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditModal(r)}
                      disabled={active || busy}
                      title={active ? "Stop this work before editing" : "Edit work record"}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-600 transition hover:bg-sky-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 lg:flex-none"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => askDelete(r)}
                      disabled={active || busy}
                      title={active ? "Stop this work before deleting" : "Delete work and linked payments"}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 lg:flex-none"
                    >
                      {deletingId === r._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {active ? "Stop first" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              Showing{" "}
              <span className="font-bold text-stone-800">
                {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)}
              </span>{" "}
              of <span className="font-bold text-stone-800">{filtered.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <span className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Edit modal */}
      {editingWork && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-stone-900/50 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div
            className="my-auto w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-6 py-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[28px] border-white/5" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                    <FileEdit size={21} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold">Edit Work Record</h2>
                    <p className="text-xs text-emerald-100/80">
                      Update work details and recalculate advance
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-xl p-2 text-emerald-100 transition hover:bg-white/10 disabled:opacity-40"
                  aria-label="Close edit modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateWork}>
              <div className="space-y-5 p-6">
                <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-bold text-white">
                    {initials(editingWork.farmerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900">{editingWork.farmerName}</p>
                    <p className="truncate text-xs text-stone-400">Work ID: {editingWork._id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
                      Work date
                    </span>
                    <input
                      type="date"
                      name="date"
                      value={editForm.date}
                      onChange={handleEditChange}
                      required
                      className={`${fieldCls} px-4`}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
                      Work type
                    </span>
                    <input
                      type="text"
                      name="workType"
                      value={editForm.workType}
                      onChange={handleEditChange}
                      placeholder="e.g. Haal, Tractor"
                      required
                      className={`${fieldCls} px-4`}
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
                      Field name
                    </span>
                    <input
                      type="text"
                      name="fieldName"
                      value={editForm.fieldName}
                      onChange={handleEditChange}
                      placeholder="Enter field name"
                      className={`${fieldCls} px-4`}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
                      Duration (minutes)
                    </span>
                    <input
                      type="number"
                      name="totalMinutes"
                      min="0"
                      step="0.01"
                      value={editForm.totalMinutes}
                      onChange={handleEditChange}
                      onWheel={(e) => e.currentTarget.blur()}
                      required
                      className={`${fieldCls} px-4`}
                    />
                    <span className="mt-1 block text-[11px] font-semibold text-stone-500">
                      = {formatMinutes(editForm.totalMinutes)}
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
                      Rate per hour (₹)
                    </span>
                    <div className="relative">
                      <IndianRupee
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        type="number"
                        name="ratePerHour"
                        min="0"
                        step="0.01"
                        value={editForm.ratePerHour}
                        onChange={handleEditChange}
                        onWheel={(e) => e.currentTarget.blur()}
                        required
                        className={`${fieldCls} pl-10 pr-4`}
                      />
                    </div>
                  </label>
                </div>

                {/* New amount */}
                <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-5 text-white shadow-lg shadow-emerald-600/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                        Updated work amount
                      </p>
                      <p className="mt-0.5 text-[11px] text-emerald-100/80">
                        Estimate, rounded up to the next rupee
                      </p>
                    </div>
                    <p className="text-3xl font-extrabold tabular-nums tracking-tight">
                      {inr(calculatedAmount)}
                    </p>
                  </div>
                  <p className="mt-3 border-t border-white/20 pt-3 text-[11px] text-emerald-50">
                    ({Number(editForm.totalMinutes || 0)} ÷ 60) × ₹
                    {Number(editForm.ratePerHour || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Current breakdown */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
                      Current payment breakdown
                    </p>
                    <StatusBadge status={editingWork.paymentStatus} />
                  </div>
                  <Breakdown work={editingWork} showLegend />
                  <p className="mt-2 text-[11px] leading-5 text-stone-400">
                    Direct paid amount stays unchanged. Previous advance is restored and
                    recalculated by the backend.
                  </p>
                </div>

                <div className="flex gap-2.5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Advance will be recalculated</p>
                    <p className="mt-1 text-[11px] leading-5 text-amber-700">
                      On saving, the backend restores this work&apos;s previous advance
                      allocations and applies available farmer advance again for the updated
                      amount. Direct payments remain unchanged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50/80 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingId) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-stone-900">Delete this work record?</h3>

            <div className="mt-3 space-y-1.5 rounded-2xl bg-stone-50 p-4 text-sm ring-1 ring-stone-100">
              <DeleteRow label="Farmer" value={deleteTarget.farmerName} />
              <DeleteRow label="Work" value={deleteTarget.workType || "General"} />
              <DeleteRow label="Amount" value={inr(deleteTarget.totalAmount)} />
              <DeleteRow label="Direct paid" value={inr(deleteTarget.directPaidAmount)} />
              <DeleteRow label="Advance adjusted" value={inr(deleteTarget.advanceAppliedAmount)} />
              <DeleteRow label="Due" value={inr(deleteTarget.dueAmount)} />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              This permanently deletes the work and its linked payment records. Applied
              advance will be restored/reconciled where possible. This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingId && <Loader2 size={15} className="animate-spin" />}
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-stone-500">{label}</span>
      <span className="truncate font-bold tabular-nums text-stone-800">{value}</span>
    </div>
  );
}