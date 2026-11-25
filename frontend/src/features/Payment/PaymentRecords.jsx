import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Search,
  RefreshCw,
  Wallet,
  IndianRupee,
  TrendingUp,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Loader2,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Banknote,
  Smartphone,
  CreditCard,
  Landmark,
  ReceiptText,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api/payment`;

const PAGE_LIMIT = 10;

/* ------------------------------ helpers ------------------------------ */

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

const METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "BANK", label: "Bank", icon: Landmark },
];

const STATUS_META = {
  SUCCESS: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  PENDING: { cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock },
  FAILED: { cls: "bg-rose-50 text-rose-700 ring-rose-200", icon: XCircle },
  REVERSED: { cls: "bg-stone-100 text-stone-600 ring-stone-200", icon: RotateCcw },
};

const getStatusMeta = (status) =>
  STATUS_META[String(status || "").toUpperCase()] || {
    cls: "bg-stone-100 text-stone-600 ring-stone-200",
    icon: AlertCircle,
  };

const EMPTY_SUMMARY = {
  totalAmount: 0,
  appliedAmount: 0,
  advanceAmount: 0,
  count: 0,
};

const fieldCls =
  "rounded-2xl border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

/* ------------------------------ page ------------------------------ */

const PaymentRecords = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [advanceOnly, setAdvanceOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    note: "",
  });

  const reqRef = useRef(0); // ignore responses from outdated requests

  /* ---------------- fetch ---------------- */

  const fetchPayments = useCallback(
    async (showRefresh = false) => {
      const reqId = ++reqRef.current;

      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        // Backend ke naam: paymentMethod / fromDate / toDate
        // (pehle method / from / to bhej rahe the, isliye filters kaam nahi karte the)
        const params = { page, limit: PAGE_LIMIT };
        if (methodFilter) params.paymentMethod = methodFilter;
        if (statusFilter) params.status = statusFilter;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        if (advanceOnly) params.advanceOnly = "true";

        const { data } = await axios.get(`${API}/records`, {
          params,
          withCredentials: true,
          timeout: 20000,
        });

        if (reqId !== reqRef.current) return;

        if (!data.success) {
          throw new Error(data.message || "Unable to fetch payments");
        }

        const s = data.summary || {};
        const records = data.pagination?.totalRecords ?? data.pagination?.total ?? 0;

        setPayments(data.payments || []);
        setSummary({
          totalAmount: s.totalAmount ?? 0,
          appliedAmount: s.totalAppliedAmount ?? s.appliedAmount ?? 0,
          advanceAmount: s.totalAdvanceAmount ?? s.advanceAmount ?? 0,
          count: s.successfulCount ?? s.count ?? records,
        });
        setTotalPages(data.pagination?.totalPages ?? data.pagination?.pages ?? 1);
        setTotalRecords(records);
      } catch (err) {
        if (reqId !== reqRef.current) return;
        console.error("FETCH PAYMENT RECORDS ERROR:", err);

        const message =
          err.response?.data?.message ||
          (err.code === "ERR_NETWORK"
            ? "Could not connect to the server."
            : err.message || "Failed to fetch payment records");

        setError(message);
        toast.error(message);
      } finally {
        if (reqId === reqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [page, methodFilter, statusFilter, fromDate, toDate, advanceOnly]
  );

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  /* ---------------- search (current page only) ---------------- */

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;

    return payments.filter((payment) => {
      const haystack = [
        payment.farmerID?.name,
        payment.driverID?.name,
        payment.transactionId,
        payment._id,
        payment.workId?._id || payment.workId,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [payments, search]);

  const hasFilters = Boolean(
    search || methodFilter || statusFilter || fromDate || toDate || advanceOnly
  );

  const resetFilters = () => {
    setSearch("");
    setMethodFilter("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setAdvanceOnly(false);
    setPage(1);
  };

  /* ---------------- edit ---------------- */

  const openEditModal = (payment) => {
    if (payment.status !== "SUCCESS") {
      toast.error("Only successful payments can be edited.");
      return;
    }
    setEditingPayment(payment);
    setEditForm({
      amount: String(payment.amount || ""),
      paymentMethod: payment.paymentMethod || "CASH",
      note: payment.note || "",
    });
  };

  const closeEditModal = useCallback(() => {
    if (saving) return;
    setEditingPayment(null);
    setEditForm({ amount: "", paymentMethod: "CASH", note: "" });
  }, [saving]);

  const editChanged =
    editingPayment &&
    (Number(editForm.amount) !== Number(editingPayment.amount) ||
      editForm.paymentMethod !== (editingPayment.paymentMethod || "CASH") ||
      editForm.note !== (editingPayment.note || ""));

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPayment) return;

    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    try {
      setSaving(true);

      const { data } = await axios.patch(
        `${API}/${editingPayment._id}`,
        {
          amount,
          paymentMethod: editForm.paymentMethod,
          note: editForm.note,
        },
        { withCredentials: true, timeout: 20000 }
      );

      if (!data.success) throw new Error(data.message || "Payment update failed");

      toast.success("Payment updated successfully!");
      setSaving(false);
      setEditingPayment(null);
      await fetchPayments(true);
    } catch (err) {
      console.error("UPDATE PAYMENT ERROR:", err);
      toast.error(err.response?.data?.message || err.message || "Unable to update payment");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- delete ---------------- */

  const askDelete = (payment) => {
    if (payment.status !== "SUCCESS") {
      toast.error("Only successful payments can be deleted.");
      return;
    }
    setDeleteTarget(payment);
  };

  const confirmDelete = async () => {
    const payment = deleteTarget;
    if (!payment) return;

    try {
      setDeletingId(payment._id);

      const { data } = await axios.delete(`${API}/${payment._id}`, {
        withCredentials: true,
        timeout: 20000,
      });

      if (!data.success) throw new Error(data.message || "Payment deletion failed");

      toast.success("Payment deleted successfully!");
      setDeleteTarget(null);

      // Last row on this page: step back one page (the effect refetches)
      if (payments.length === 1 && page > 1) setPage((prev) => prev - 1);
      else await fetchPayments(true);
    } catch (err) {
      console.error("DELETE PAYMENT ERROR:", err);
      toast.error(err.response?.data?.message || err.message || "Unable to delete payment");
    } finally {
      setDeletingId(null);
    }
  };

  // Escape closes whichever modal is open
  useEffect(() => {
    if (!editingPayment && !deleteTarget) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (deleteTarget && !deletingId) setDeleteTarget(null);
      else closeEditModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingPayment, deleteTarget, deletingId, closeEditModal]);

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-white/15">
              <ReceiptText size={13} />
              Payment Records
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
              Total received
            </p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl">
              {money(summary.totalAmount)}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              Track, edit and manage all farmer payments
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-3">
            <HeroChip icon={Wallet} label="Transactions" value={summary.count || 0} />
            <HeroChip icon={TrendingUp} label="Applied to work" value={money(summary.appliedAmount)} />
            <HeroChip icon={ArrowDownToLine} label="Advance generated" value={money(summary.advanceAmount)} />
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">All Transactions</h2>
            <p className="text-xs text-stone-400">{totalRecords} payment records found</p>
          </div>

          <div className="flex gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
              >
                <Filter size={15} />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchPayments(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div>
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer, driver or transaction ID"
              className={`${fieldCls} w-full py-3 pl-11 pr-10 placeholder:font-normal placeholder:text-stone-400`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition hover:bg-stone-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {search && (
            <p className="mt-1.5 px-1 text-[11px] text-stone-400">
              Search filters the records on this page only.
            </p>
          )}
        </div>

        {/* Method chips + status */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ id: "", label: "All methods" }, ...METHODS].map((m) => {
            const active = methodFilter === m.id;
            return (
              <button
                key={m.id || "all"}
                type="button"
                onClick={() => {
                  setMethodFilter(m.id);
                  setPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {m.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setAdvanceOnly((prev) => !prev);
              setPage(1);
            }}
            aria-pressed={advanceOnly}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
              advanceOnly
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <Wallet size={14} />
            Advance only
          </button>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className={`${fieldCls} ml-auto px-4 py-2.5`}
          >
            <option value="">All status</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>

        {/* Dates */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-400">
            <CalendarDays size={15} />
            Date range
          </span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            aria-label="From date"
            className={`${fieldCls} px-4 py-2.5`}
          />
          <span className="text-xs font-semibold text-stone-400">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            aria-label="To date"
            className={`${fieldCls} px-4 py-2.5`}
          />
        </div>
      </section>

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col gap-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <AlertCircle size={18} />
            {error}
          </div>
          <button
            onClick={() => fetchPayments()}
            className="self-start rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )}

      {/* Records */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
              <Wallet size={30} />
            </div>
            <h3 className="mt-4 font-bold text-stone-800">No payment records found</h3>
            <p className="mt-1 max-w-sm text-sm text-stone-500">
              Try changing your filters or searching for another transaction.
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 text-sm font-bold text-emerald-700 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filteredPayments.map((payment) => (
              <PaymentRow
                key={payment._id}
                payment={payment}
                deleting={deletingId === payment._id}
                onEdit={() => openEditModal(payment)}
                onDelete={() => askDelete(payment)}
              />
            ))}
          </ul>
        )}

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              Page <span className="font-bold text-stone-800">{page}</span> of{" "}
              <span className="font-bold text-stone-800">{totalPages}</span> ·{" "}
              {totalRecords} records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
      {editingPayment && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-stone-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div
            className="my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-extrabold text-stone-900">Edit Payment</h2>
                <p className="mt-0.5 text-xs text-stone-400">
                  Update payment details and accounting
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                aria-label="Close"
                className="rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 p-6">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-bold text-white">
                    {initials(editingPayment.farmerID?.name)}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                      Farmer
                    </p>
                    <p className="font-bold text-stone-900">
                      {editingPayment.farmerID?.name || "Unknown Farmer"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                    Transaction
                  </p>
                  <p className="text-sm font-bold text-stone-800">
                    {editingPayment.transactionId || "—"}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="edit-amount" className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                  Payment amount
                </label>
                <div className="relative">
                  <IndianRupee
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    id="edit-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Enter amount"
                    className={`${fieldCls} w-full py-3.5 pl-11 pr-4 text-lg font-extrabold tabular-nums`}
                  />
                </div>
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                  Payment method
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map(({ id, label, icon: Icon }) => {
                    const active = editForm.paymentMethod === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setEditForm((p) => ({ ...p, paymentMethod: id }))}
                        aria-pressed={active}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition ${
                          active
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                            : "bg-stone-50 text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="edit-note" className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                  Note
                </label>
                <textarea
                  id="edit-note"
                  rows={3}
                  value={editForm.note}
                  onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="Add payment note..."
                  className={`${fieldCls} w-full resize-none px-4 py-3 font-medium`}
                />
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-800">
                  Changing the amount recalculates the applied amount, advance amount
                  and remaining work due. If the original advance has already been used,
                  the backend may reject the update for accounting safety.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editChanged}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingId) setDeleteTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-stone-900">
              Delete payment of {money(deleteTarget.amount)}?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              This reverses its accounting impact on the linked work and the farmer&apos;s
              advance balance.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
              >
                Keep it
              </button>
              <button
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
};

export default PaymentRecords;

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

// Defined outside the page component so it isn't re-created on every render
function PaymentRow({ payment, deleting, onEdit, onDelete }) {
  const meta = getStatusMeta(payment.status);
  const StatusIcon = meta.icon;
  const isSuccess = payment.status === "SUCCESS";

  const amount = Number(payment.amount) || 0;
  const applied = Number(payment.appliedAmount) || 0;
  const advance = Number(payment.advanceAmount) || 0;
  const appliedPct = amount > 0 ? Math.min(100, (applied / amount) * 100) : 0;
  const advancePct = amount > 0 ? Math.min(100 - appliedPct, (advance / amount) * 100) : 0;

  const farmerName = payment.farmerID?.name || "Unknown Farmer";
  const MethodIcon = METHODS.find((m) => m.id === payment.paymentMethod)?.icon || Wallet;

  // Advance jama hua ho (alag se advance ya zyada payment ka extra) to row highlight
  const hasAdvance = advance > 0;
  const isAdvanceOnly = payment.paymentType === "ADVANCE";

  return (
    <li
      className={`grid gap-4 p-5 transition lg:grid-cols-12 lg:items-center ${
        hasAdvance
          ? "border-l-4 border-amber-400 bg-amber-50/70 hover:bg-amber-50"
          : "border-l-4 border-transparent hover:bg-emerald-50/30"
      }`}
    >
      {/* Farmer */}
      <div className="flex min-w-0 items-center gap-3 lg:col-span-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-bold text-white shadow-md">
          {initials(farmerName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-stone-900">{farmerName}</p>
          <p className="truncate text-xs text-stone-400">
            {payment.transactionId || `#${String(payment._id).slice(-7)}`}
            {payment.driverID?.name ? ` · Driver: ${payment.driverID.name}` : ""}
          </p>
        </div>
      </div>

      {/* Amount + split */}
      <div className="lg:col-span-3">
        {hasAdvance && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 ring-1 ring-amber-300">
            <Wallet size={10} />
            {isAdvanceOnly ? "Advance received" : `+ ${money(advance)} advance`}
          </span>
        )}
        <p
          className={`text-lg font-extrabold tabular-nums ${
            hasAdvance ? "text-amber-900" : "text-stone-900"
          }`}
        >
          {money(amount)}
        </p>
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full bg-emerald-500" style={{ width: `${appliedPct}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${advancePct}%` }} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] font-semibold">
          <span className="text-emerald-700">Applied {money(applied)}</span>
          <span className={hasAdvance ? "font-extrabold text-amber-800" : "text-amber-700"}>
            Advance {money(advance)}
          </span>
        </p>

        {hasAdvance && payment.advanceInfo && (
          <div className="mt-2 rounded-lg bg-white/80 p-2 ring-1 ring-amber-200">
            {payment.advanceInfo.reversed ? (
              <p className="text-[11px] font-bold text-rose-600">
                Advance reverse ho chuka hai
              </p>
            ) : (
              <>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${
                        payment.advanceInfo.given > 0
                          ? Math.min(100, (payment.advanceInfo.used / payment.advanceInfo.given) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] font-semibold">
                  <span className="text-stone-700">Diya {money(payment.advanceInfo.given)}</span>
                  <span className="text-amber-800">Use {money(payment.advanceInfo.used)}</span>
                  <span className="font-extrabold text-emerald-700">
                    Bacha {money(payment.advanceInfo.remaining)}
                  </span>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Method + date */}
      <div className="lg:col-span-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
          <MethodIcon size={13} />
          {payment.paymentMethod || "—"}
        </span>
        <p className="mt-1.5 text-xs text-stone-500">{formatDate(payment.createdAt)}</p>
      </div>

      {/* Status */}
      <div className="lg:col-span-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${meta.cls}`}
        >
          <StatusIcon size={13} />
          {payment.status || "UNKNOWN"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 lg:col-span-1 lg:justify-end">
        <button
          type="button"
          onClick={onEdit}
          disabled={!isSuccess}
          title="Edit payment"
          aria-label="Edit payment"
          className="rounded-xl bg-sky-50 p-2.5 text-sky-600 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!isSuccess || deleting}
          title="Delete payment"
          aria-label="Delete payment"
          className="rounded-xl bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </div>
    </li>
  );
}