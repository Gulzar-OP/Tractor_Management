import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  RefreshCw,
  User,
  Receipt,
  TrendingUp,
  CreditCard,
  Tractor,
  Banknote,
  Smartphone,
  Landmark,
  ChevronDown,
  X,
  ArrowLeft,
} from "lucide-react";

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "BANK", label: "Bank", icon: Landmark },
];

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getFarmerName = (farmer) => {
  if (!farmer) return "Unknown Farmer";
  return farmer.name || farmer.fullName || farmer.farmerName || "Unknown Farmer";
};

const getFarmerId = (farmer) => farmer?._id || farmer?.id || "";

const getDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.farmers)) return data.farmers;
  if (Array.isArray(data?.all)) return data.all;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const labelCls =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400";

/* ------------------------------ page ------------------------------ */

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const incoming = location.state || {};

  const [activeTab, setActiveTab] = useState(
    incoming.paymentType === "ADVANCE" ? "ADVANCE" : "WORK_PAYMENT"
  );

  const [farmers, setFarmers] = useState([]);
  const [works, setWorks] = useState([]);

  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [farmerId, setFarmerId] = useState(incoming.farmerID || "");
  const [workId, setWorkId] = useState(incoming.workId || "");

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [note, setNote] = useState("");
  // Advance tab: pehle purana due chukao, bacha hua advance me jaaye
  const [clearOldDueFirst, setClearOldDueFirst] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const toastTimer = useRef(null);
  const worksReq = useRef(0); // guards against out-of-order responses

  const isAdvance = activeTab === "ADVANCE";

  /* ---------------- toast ---------------- */

  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---------------- selected farmer ---------------- */

  const selectedFarmer = useMemo(
    () => farmers.find((f) => getFarmerId(f) === farmerId) || null,
    [farmers, farmerId]
  );

  const existingAdvance = Number(selectedFarmer?.advanceAmount || 0);
  const farmerTotalBilled = Number(selectedFarmer?.totalBilledAmount || 0);
  const farmerTotalPaid = Number(selectedFarmer?.totalPaidAmount || 0);
  const farmerTotalDue = Number(selectedFarmer?.totalDueAmount || 0);

  /* ---------------- fetch ---------------- */

  const fetchFarmers = useCallback(async () => {
    try {
      const res = await axios.post(
        `${API}/farmer/all-farmer`,
        {},
        { withCredentials: true }
      );
      const list = getArray(res.data);
      setFarmers(list);
      return list;
    } catch (error) {
      console.error("Fetch Farmers Error:", error);
      showToast("error", error.response?.data?.message || "Could not load farmers list");
      return [];
    }
  }, [showToast]);

  const fetchFarmerWorks = useCallback(
    async (selectedId, preferredWorkId = "") => {
      if (!selectedId) {
        setWorks([]);
        setWorkId("");
        return null;
      }

      const reqId = ++worksReq.current;

      try {
        setLoadingWorks(true);

        const res = await axios.get(`${API}/farmer/${selectedId}`, {
          withCredentials: true,
        });

        // A newer farmer was selected while this was loading: drop this response
        if (reqId !== worksReq.current) return null;

        const farmerData = res.data?.farmer || res.data?.data || res.data;
        const allWorks = Array.isArray(farmerData?.works) ? farmerData.works : [];
        const dueWorks = allWorks.filter((w) => Number(w.dueAmount || 0) > 0);

        setWorks(dueWorks);

        const preferred = dueWorks.find((w) => w._id === preferredWorkId);
        setWorkId(preferred?._id || dueWorks[0]?._id || "");

        return farmerData;
      } catch (error) {
        if (reqId !== worksReq.current) return null;
        console.error("Fetch Works Error:", error);
        showToast("error", error.response?.data?.message || "Could not load work records");
        setWorks([]);
        setWorkId("");
        return null;
      } finally {
        if (reqId === worksReq.current) setLoadingWorks(false);
      }
    },
    [showToast]
  );

  // Load the farmer list once.
  // NOTE: no farmer is auto-selected any more, so a payment can never be
  // recorded against the wrong person just because they were first in the list.
  useEffect(() => {
    const load = async () => {
      setLoadingFarmers(true);
      await fetchFarmers();
      setLoadingFarmers(false);
    };
    load();
  }, [fetchFarmers]);

  // Work records are only needed for the Work Payment tab
  useEffect(() => {
    if (isAdvance || !farmerId) {
      setWorks([]);
      setWorkId("");
      return;
    }
    fetchFarmerWorks(farmerId, incoming.workId || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, isAdvance, fetchFarmerWorks]);

  /* ---------------- selected work + calculations ---------------- */

  const selectedWork = useMemo(
    () => works.find((w) => w._id === workId) || null,
    [works, workId]
  );

  const dueAmount = Number(selectedWork?.dueAmount ?? 0);
  const workTotalAmount = Number(selectedWork?.totalAmount ?? 0);
  const workPaidAmount = Number(selectedWork?.paidAmount ?? 0);

  const numericAmount = amount === "" ? 0 : Number(amount);
  const amountInvalid =
    amount !== "" && (!Number.isFinite(numericAmount) || numericAmount <= 0);
  const amountReady = amount !== "" && !amountInvalid;

  const appliedAmount = selectedWork
    ? Math.min(Math.max(numericAmount, 0), dueAmount)
    : 0;
  const newAdvance = selectedWork ? Math.max(numericAmount - dueAmount, 0) : 0;
  const remainingDue = Math.max(dueAmount - appliedAmount, 0);
  const isOverpayment = Boolean(selectedWork) && amountReady && numericAmount > dueAmount;
  const estimatedAdvance = existingAdvance + newAdvance;

  // Advance tab preview (estimate: farmer ka total due use hota hai,
  // asli allocation backend sirf STOPPED works par karta hai)
  const useDueFirst = isAdvance && clearOldDueFirst && farmerTotalDue > 0;
  const advanceDueCleared = useDueFirst
    ? Math.min(Math.max(numericAmount, 0), farmerTotalDue)
    : 0;
  const advanceCredited = Math.max(numericAmount - advanceDueCleared, 0);
  const estimatedAdvanceAfterReceive = existingAdvance + advanceCredited;

  /* ---------------- validation ---------------- */

  const canSubmit = isAdvance
    ? Boolean(farmerId) && amountReady && !submitting
    : Boolean(farmerId) &&
      Boolean(selectedWork) &&
      amountReady &&
      !submitting &&
      !loadingWorks;

  /* ---------------- actions ---------------- */

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setAmount("");
    setNote("");
    setToast(null);
  };

  const handleFarmerChange = (value) => {
    setFarmerId(value);
    setWorkId("");
    setAmount("");
    setNote("");
    setClearOldDueFirst(true);
  };

  const handleRefresh = async () => {
    if (!farmerId) {
      showToast("error", "Please select a farmer");
      return;
    }

    try {
      setRefreshing(true);
      await Promise.all([
        fetchFarmers(),
        isAdvance ? Promise.resolve() : fetchFarmerWorks(farmerId, workId),
      ]);
      showToast("success", "Account details refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setToast(null);

      // ---- Independent farmer advance ----
      if (isAdvance) {
        const res = await axios.post(
          `${API}/payment/advance`,
          {
            farmerID: farmerId,
            amount: numericAmount,
            paymentMethod,
            note: note.trim(),
            clearOldDueFirst: useDueFirst,
          },
          { withCredentials: true }
        );

        if (!res.data?.success) {
          showToast("error", res.data?.message || "Advance payment failed");
          return;
        }

        showToast(
          "success",
          res.data?.message ||
            `${formatCurrency(numericAmount)} advance received successfully`
        );
        setAmount("");
        setNote("");
        await fetchFarmers();
        return;
      }

      // ---- Work payment ----
      const driverID =
        selectedWork?.createdBy || incoming.driverID || selectedFarmer?.createdBy;

      if (!driverID) {
        showToast("error", "Could not determine driver for this work");
        return;
      }

      const res = await axios.post(
        `${API}/payment`,
        {
          driverID,
          workId,
          amount: numericAmount,
          paymentMethod,
          note: note.trim(),
        },
        { withCredentials: true }
      );

      if (!res.data?.success) {
        showToast("error", res.data?.message || "Payment failed");
        return;
      }

      const summary = res.data.summary || {};
      const actualAdvance = Number(summary.advanceAmount ?? newAdvance);

      showToast(
        "success",
        actualAdvance > 0
          ? `Payment saved! ${formatCurrency(actualAdvance)} added to advance balance`
          : "Payment saved successfully"
      );

      setAmount("");
      setNote("");

      await Promise.all([fetchFarmers(), fetchFarmerWorks(farmerId, "")]);
    } catch (error) {
      console.error("Payment Error:", error);
      showToast(
        "error",
        error.response?.data?.message || "Something went wrong while saving payment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- theme ---------------- */

  const accentBtn = isAdvance
    ? "bg-amber-500 shadow-amber-500/25 hover:bg-amber-600"
    : "bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700";

  const focusCls = isAdvance
    ? "focus:border-amber-500 focus:ring-amber-100"
    : "focus:border-emerald-500 focus:ring-emerald-100";

  const baseInput = `w-full rounded-2xl border bg-stone-50 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:bg-white focus:ring-4 ${focusCls}`;

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[36px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Payments
              </h1>
              <p className="mt-1 text-sm text-emerald-100/80">
                Manage work payments and farmer advances
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || !farmerId}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-bold ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-stone-900/5">
        <button
          type="button"
          onClick={() => switchTab("WORK_PAYMENT")}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition ${
            !isAdvance
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          <Tractor size={18} />
          Work Payment
        </button>
        <button
          type="button"
          onClick={() => switchTab("ADVANCE")}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition ${
            isAdvance
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          <Wallet size={18} />
          Farmer Advance
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* ============ FORM ============ */}
        <form
          onSubmit={submit}
          className="space-y-5 rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 sm:p-8 lg:col-span-3"
        >
          {/* Intro */}
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 ${
              isAdvance ? "bg-amber-50" : "bg-emerald-50"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isAdvance ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isAdvance ? <Wallet size={20} /> : <Receipt size={20} />}
            </div>
            <div>
              <h2
                className={`font-extrabold ${
                  isAdvance ? "text-amber-900" : "text-emerald-900"
                }`}
              >
                {isAdvance ? "Receive Farmer Advance" : "Record Work Payment"}
              </h2>
              <p
                className={`mt-0.5 text-xs leading-relaxed ${
                  isAdvance ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {isAdvance
                  ? "Receive money before any work is done. The balance adjusts automatically against future work."
                  : "Pick an outstanding work and record the amount received. Any extra becomes farmer advance."}
              </p>
            </div>
          </div>

          {/* Farmer */}
          <div>
            <label htmlFor="farmer" className={labelCls}>
              Farmer
            </label>
            <div className="relative">
              <User
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <select
                id="farmer"
                value={farmerId}
                onChange={(e) => handleFarmerChange(e.target.value)}
                disabled={loadingFarmers}
                className={`${baseInput} appearance-none border-stone-200 py-3.5 pl-11 pr-10 disabled:opacity-60`}
              >
                <option value="">
                  {loadingFarmers ? "Loading farmers..." : "Select a farmer"}
                </option>
                {farmers.map((farmer) => {
                  const due = Number(farmer.totalDueAmount || 0);
                  return (
                    <option key={getFarmerId(farmer)} value={getFarmerId(farmer)}>
                      {getFarmerName(farmer)}
                      {due > 0 ? ` — Due ${formatCurrency(due)}` : ""}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
              />
            </div>
          </div>

          {/* Work */}
          {!isAdvance && (
            <div>
              <label htmlFor="work" className={labelCls}>
                Work (with outstanding due)
              </label>
              <div className="relative">
                <Tractor
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <select
                  id="work"
                  value={workId}
                  onChange={(e) => {
                    setWorkId(e.target.value);
                    setAmount("");
                  }}
                  disabled={!farmerId || loadingWorks || works.length === 0}
                  className={`${baseInput} appearance-none border-stone-200 py-3.5 pl-11 pr-10 disabled:opacity-60`}
                >
                  <option value="">
                    {!farmerId
                      ? "Select a farmer first"
                      : loadingWorks
                        ? "Loading works..."
                        : works.length === 0
                          ? "No due works for this farmer"
                          : "Select work"}
                  </option>
                  {works.map((work) => (
                    <option key={work._id} value={work._id}>
                      {work.workType || work.type || "Work"} — Due{" "}
                      {formatCurrency(work.dueAmount)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>

              {selectedWork && (
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100 sm:grid-cols-4">
                  <DetailItem label="Work amount" value={formatCurrency(workTotalAmount)} />
                  <DetailItem label="Already paid" value={formatCurrency(workPaidAmount)} />
                  <DetailItem label="Remaining" value={formatCurrency(dueAmount)} color="red" />
                  <DetailItem
                    label="Work date"
                    value={getDate(selectedWork.date || selectedWork.startTime)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label htmlFor="amount" className={labelCls}>
              {isAdvance ? "Advance amount" : "Payment amount"}
            </label>
            <div className="relative">
              <IndianRupee
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className={`${baseInput} py-4 pl-11 pr-4 text-xl font-extrabold tabular-nums ${
                  amountInvalid
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-stone-200"
                }`}
              />
            </div>

            {amountInvalid && (
              <p className="mt-1.5 text-xs font-medium text-rose-600">
                Enter a valid amount greater than zero.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {!isAdvance && selectedWork && (
                <>
                  <QuickChip tone="emerald" onClick={() => setAmount(String(dueAmount))}>
                    Pay full due
                  </QuickChip>
                  <QuickChip
                    tone="stone"
                    onClick={() => setAmount(String(Math.ceil(dueAmount / 2)))}
                  >
                    Pay half
                  </QuickChip>
                </>
              )}
              {isAdvance &&
                [500, 1000, 2000, 5000].map((v) => (
                  <QuickChip key={v} tone="amber" onClick={() => setAmount(String(v))}>
                    ₹{v.toLocaleString("en-IN")}
                  </QuickChip>
                ))}
            </div>
          </div>

          {/* Purana due pehle (sirf Advance tab, jab farmer par due ho) */}
          {isAdvance && selectedFarmer && farmerTotalDue > 0 && (
            <label
              htmlFor="clearOldDue"
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200"
            >
              <input
                id="clearOldDue"
                type="checkbox"
                checked={clearOldDueFirst}
                onChange={(e) => setClearOldDueFirst(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
              />
              <span className="text-xs leading-relaxed text-amber-900">
                <span className="block text-sm font-extrabold">
                  Pehle purana due clear karo
                </span>
                Is farmer par {formatCurrency(farmerTotalDue)} due hai. Ye paisa
                pehle purane kaam ke due (purana pehle) me lagega, bacha hua hi
                advance banega. Sirf advance rakhna ho to tick hata do.
              </span>
            </label>
          )}

          {/* Method */}
          <div>
            <span className={labelCls}>Payment method</span>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
                const active = paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition ${
                      active
                        ? isAdvance
                          ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                          : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
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

          {/* Note */}
          <div>
            <label htmlFor="note" className={labelCls}>
              Notes (optional)
            </label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isAdvance
                  ? "e.g. Advance received before field work"
                  : "e.g. Received payment through UPI"
              }
              className={`${baseInput} border-stone-200 px-4 py-3.5`}
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${accentBtn}`}
            >
              {submitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : isAdvance ? (
                <Wallet size={17} />
              ) : (
                <CreditCard size={17} />
              )}
              {submitting
                ? "Saving..."
                : amountReady
                  ? `${isAdvance ? "Receive" : "Save"} ${formatCurrency(numericAmount)}`
                  : isAdvance
                    ? "Receive Advance"
                    : "Save Work Payment"}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="rounded-2xl bg-stone-100 px-6 py-4 text-sm font-bold text-stone-600 transition hover:bg-stone-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* ============ SIDE PANEL ============ */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-2">
          {/* Farmer summary */}
          {selectedFarmer ? (
            <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 font-bold text-white shadow-md">
                  {getInitials(getFarmerName(selectedFarmer))}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-stone-900">
                    {getFarmerName(selectedFarmer)}
                  </p>
                  <p className="text-xs text-stone-400">Account summary</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <SummaryTile title="Billed" value={formatCurrency(farmerTotalBilled)} tone="sky" icon={Receipt} />
                <SummaryTile title="Paid" value={formatCurrency(farmerTotalPaid)} tone="green" icon={CheckCircle2} />
                <SummaryTile title="Due" value={formatCurrency(farmerTotalDue)} tone="red" icon={AlertCircle} />
                <SummaryTile title="Advance" value={formatCurrency(existingAdvance)} tone="amber" icon={Wallet} />
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border-2 border-dashed border-stone-200 bg-white/60 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
                <User size={26} />
              </div>
              <p className="mt-3 text-sm font-bold text-stone-600">No farmer selected</p>
              <p className="mt-1 text-xs text-stone-400">
                Choose a farmer to see their account and a payment preview.
              </p>
            </div>
          )}

          {/* Preview: advance */}
          {isAdvance && selectedFarmer && amountReady && (
            <div className="rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-400 p-6 text-white shadow-lg shadow-amber-500/20">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Wallet size={17} />
                Advance Summary
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <PreviewRow label="Existing advance" value={formatCurrency(existingAdvance)} />
                <PreviewRow label="Total received" value={formatCurrency(numericAmount)} />
                {advanceDueCleared > 0 && (
                  <PreviewRow
                    label="Purana due clear"
                    value={`- ${formatCurrency(advanceDueCleared)}`}
                  />
                )}
                <PreviewRow
                  label="New advance"
                  value={`+ ${formatCurrency(advanceCredited)}`}
                />
                <div className="border-t border-white/30 pt-3">
                  <PreviewRow
                    label="Estimated balance"
                    value={formatCurrency(estimatedAdvanceAfterReceive)}
                    bold
                  />
                </div>
              </div>

              <p className="mt-4 rounded-xl bg-white/20 p-3 text-xs leading-relaxed">
                {advanceDueCleared > 0
                  ? "Pehle purane works ka due chukega (purana pehle), bacha hua paisa advance me jayega. Ye estimate hai, asli hisaab backend karta hai."
                  : "Saved as an independent advance. No work is paid in this transaction; future completed work can consume this balance automatically."}
              </p>
            </div>
          )}

          {/* Preview: work payment */}
          {!isAdvance && selectedWork && amountReady && (
            <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
              <div className="flex items-center gap-2 text-sm font-extrabold text-stone-800">
                <TrendingUp size={17} className="text-emerald-600" />
                Payment Breakdown
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <BreakdownRow label="Total received" value={formatCurrency(numericAmount)} />
                <BreakdownRow label="Applied to this work" value={formatCurrency(appliedAmount)} color="green" />
                <BreakdownRow label="Remaining work due" value={formatCurrency(remainingDue)} color="red" />
                {newAdvance > 0 && (
                  <BreakdownRow label="New advance created" value={formatCurrency(newAdvance)} color="amber" />
                )}
                <div className="space-y-2.5 border-t border-stone-100 pt-3">
                  <BreakdownRow label="Existing advance" value={formatCurrency(existingAdvance)} />
                  <BreakdownRow
                    label="Estimated advance"
                    value={formatCurrency(estimatedAdvance)}
                    color="amber"
                    bold
                  />
                </div>
              </div>

              {isOverpayment && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  You&apos;re paying {formatCurrency(newAdvance)} more than this work&apos;s
                  due. The extra will be saved as farmer advance.
                </div>
              )}

              <p className="mt-3 text-[11px] text-stone-400">
                This is a preview. The backend calculates and saves the actual allocation.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-4 z-50 flex max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-2xl sm:right-8 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-1 opacity-70 transition hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ parts ------------------------------ */

function QuickChip({ tone = "stone", onClick, children }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    stone: "bg-stone-100 text-stone-600 hover:bg-stone-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function SummaryTile({ title, value, icon: Icon, tone }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl p-3.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wide opacity-80">
        {title}
        <Icon size={14} />
      </div>
      <p className="mt-1.5 break-words text-base font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function DetailItem({ label, value, color = "default" }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-extrabold tabular-nums ${
          color === "red" ? "text-rose-600" : "text-stone-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BreakdownRow({ label, value, color = "default", bold = false }) {
  const colors = {
    default: "text-stone-800",
    green: "text-emerald-600",
    red: "text-rose-600",
    amber: "text-amber-700",
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-stone-500">{label}</span>
      <span className={`tabular-nums ${colors[color]} ${bold ? "font-extrabold" : "font-bold"}`}>
        {value}
      </span>
    </div>
  );
}

function PreviewRow({ label, value, bold = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/85">{label}</span>
      <span className={`tabular-nums ${bold ? "text-lg font-extrabold" : "font-bold"}`}>
        {value}
      </span>
    </div>
  );
}