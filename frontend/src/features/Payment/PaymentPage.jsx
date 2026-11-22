
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  CalendarDays,
} from "lucide-react";

import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Field from "../../components/UI/Field";
import PrimaryButton from "../../components/UI/PrimaryButton";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK"];

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getFarmerName = (farmer) => {
  if (!farmer) return "Unknown Farmer";

  return (
    farmer.name ||
    farmer.fullName ||
    farmer.farmerName ||
    "Unknown Farmer"
  );
};

const getFarmerId = (farmer) => {
  return farmer?._id || farmer?.id || "";
};

const getDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.farmers)) return data.farmers;
  if (Array.isArray(data?.all)) return data.all;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const incoming = location.state || {};

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [farmers, setFarmers] = useState([]);
  const [works, setWorks] = useState([]);

  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [farmerId, setFarmerId] = useState(
    incoming.farmerID || ""
  );

  const [workId, setWorkId] = useState(
    incoming.workId || ""
  );

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // --------------------------------------------------
  // SELECTED FARMER
  // --------------------------------------------------

  const selectedFarmer = useMemo(
    () =>
      farmers.find(
        (farmer) => getFarmerId(farmer) === farmerId
      ) || null,
    [farmers, farmerId]
  );

  const existingAdvance = Number(
    selectedFarmer?.advanceAmount || 0
  );

  const farmerTotalBilled = Number(
    selectedFarmer?.totalBilledAmount || 0
  );

  const farmerTotalPaid = Number(
    selectedFarmer?.totalPaidAmount || 0
  );

  const farmerTotalDue = Number(
    selectedFarmer?.totalDueAmount || 0
  );

  // --------------------------------------------------
  // TOAST
  // --------------------------------------------------

  const showToast = (type, message) => {
    setToast({ type, message });

    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --------------------------------------------------
  // FETCH FARMERS
  // --------------------------------------------------

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

      showToast(
        "error",
        error.response?.data?.message ||
          "Could not load farmers list"
      );

      return [];
    }
  }, []);

  // --------------------------------------------------
  // FETCH SELECTED FARMER WORKS
  // --------------------------------------------------

  const fetchFarmerWorks = useCallback(
    async (selectedId, preferredWorkId = "") => {
      if (!selectedId) {
        setWorks([]);
        setWorkId("");
        return;
      }

      try {
        setLoadingWorks(true);

        const res = await axios.get(
          `${API}/farmer/${selectedId}`,
          { withCredentials: true }
        );

        const farmerData =
          res.data?.farmer || res.data?.data || res.data;

        const allWorks = Array.isArray(farmerData?.works)
          ? farmerData.works
          : [];

        // Only works having outstanding dues
        const dueWorks = allWorks.filter(
          (work) => Number(work.dueAmount || 0) > 0
        );

        setWorks(dueWorks);

        // Keep selected work if it still has due
        const preferredWork = dueWorks.find(
          (work) => work._id === preferredWorkId
        );

        setWorkId(
          preferredWork?._id || dueWorks[0]?._id || ""
        );

        return farmerData;
      } catch (error) {
        console.error("Fetch Works Error:", error);

        showToast(
          "error",
          error.response?.data?.message ||
            "Could not load work records"
        );

        setWorks([]);
        setWorkId("");

        return null;
      } finally {
        setLoadingWorks(false);
      }
    },
    []
  );

  // --------------------------------------------------
  // INITIAL FETCH
  // --------------------------------------------------

  useEffect(() => {
    const loadFarmers = async () => {
      setLoadingFarmers(true);

      const list = await fetchFarmers();

      if (!farmerId && list.length > 0) {
        setFarmerId(getFarmerId(list[0]));
      }

      setLoadingFarmers(false);
    };

    loadFarmers();

    // Initial fetch only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // FETCH WORKS WHEN FARMER CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!farmerId) {
      setWorks([]);
      setWorkId("");
      return;
    }

    fetchFarmerWorks(farmerId, incoming.workId || "");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, fetchFarmerWorks]);

  // --------------------------------------------------
  // SELECTED WORK
  // --------------------------------------------------

  const selectedWork = useMemo(
    () => works.find((work) => work._id === workId) || null,
    [works, workId]
  );

  // --------------------------------------------------
  // PAYMENT CALCULATIONS
  // --------------------------------------------------

  const dueAmount = Number(
    selectedWork?.dueAmount ?? 0
  );

  const workTotalAmount = Number(
    selectedWork?.totalAmount ?? 0
  );

  const workPaidAmount = Number(
    selectedWork?.paidAmount ?? 0
  );

  const numericAmount =
    amount === "" ? 0 : Number(amount);

  const amountInvalid =
    amount !== "" &&
    (!Number.isFinite(numericAmount) || numericAmount <= 0);

  // Amount applied to selected work
  const appliedAmount = selectedWork
    ? Math.min(Math.max(numericAmount, 0), dueAmount)
    : 0;

  // Extra amount becomes farmer advance
  const newAdvance = selectedWork
    ? Math.max(numericAmount - dueAmount, 0)
    : 0;

  // Remaining due after this payment
  const remainingDue = Math.max(
    dueAmount - appliedAmount,
    0
  );

  const isOverpayment =
    selectedWork &&
    amount !== "" &&
    !amountInvalid &&
    numericAmount > dueAmount;

  // Estimated advance after this payment
  const estimatedAdvance =
    existingAdvance + newAdvance;

  // --------------------------------------------------
  // SUBMIT VALIDATION
  // --------------------------------------------------

  const canSubmit =
    Boolean(farmerId) &&
    Boolean(workId) &&
    Boolean(selectedWork) &&
    amount !== "" &&
    !amountInvalid &&
    Boolean(paymentMethod) &&
    !submitting &&
    !loadingWorks;

  // --------------------------------------------------
  // REFRESH ALL DATA
  // --------------------------------------------------

  const handleRefresh = async () => {
    if (!farmerId) {
      showToast("error", "Please select a farmer");
      return;
    }

    try {
      setRefreshing(true);

      await Promise.all([
        fetchFarmers(),
        fetchFarmerWorks(farmerId, workId),
      ]);

      showToast("success", "Account details refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  // --------------------------------------------------
  // SUBMIT PAYMENT
  // --------------------------------------------------

  async function submit(e) {
    e.preventDefault();

    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setToast(null);

      const driverID =
        selectedWork?.createdBy ||
        incoming.driverID ||
        selectedFarmer?.createdBy;

      if (!driverID) {
        showToast(
          "error",
          "Could not determine driver for this work"
        );

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
        showToast(
          "error",
          res.data?.message || "Payment failed"
        );

        return;
      }

      const summary = res.data.summary || {};

      const actualAdvance = Number(
        summary.advanceAmount ?? newAdvance
      );

      let successMessage = "Payment saved successfully";

      if (actualAdvance > 0) {
        successMessage =
          `Payment saved! ${formatCurrency(actualAdvance)} added to advance balance`;
      }

      showToast("success", successMessage);

      setAmount("");
      setNote("");

      // Refresh farmer account and work records
      await Promise.all([
        fetchFarmers(),
        fetchFarmerWorks(farmerId, ""),
      ]);
    } catch (error) {
      console.error("Payment Error:", error);

      showToast(
        "error",
        error.response?.data?.message ||
          "Something went wrong while saving payment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-4xl">

        {/* HEADER */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Add Payment"
            subtitle="Record payment and manage farmer balance"
          />

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || !farmerId}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <Card className="mt-6 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">

          {/* INCOMING FARMER */}

          {incoming.farmerName && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} />
              Recording payment for
              <span className="font-semibold">
                {incoming.farmerName}
              </span>
            </div>
          )}

          <form
            onSubmit={submit}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2"
          >

            {/* FARMER */}

            <div className="sm:col-span-2">
              <Field label="Select Farmer">
                <select
                  value={farmerId}
                  onChange={(e) => {
                    setFarmerId(e.target.value);
                    setWorkId("");
                    setAmount("");
                    setNote("");
                  }}
                  disabled={loadingFarmers}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="">
                    {loadingFarmers
                      ? "Loading farmers..."
                      : "Select Farmer"}
                  </option>

                  {farmers.map((farmer) => (
                    <option
                      key={getFarmerId(farmer)}
                      value={getFarmerId(farmer)}
                    >
                      {getFarmerName(farmer)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* FARMER ACCOUNT SUMMARY */}

            {selectedFarmer && (
              <div className="sm:col-span-2">

                <div className="mb-3 flex items-center gap-2">
                  <User size={18} className="text-emerald-600" />

                  <h3 className="font-semibold text-slate-800">
                    Farmer Account Summary
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                  <SummaryCard
                    title="Total Billed"
                    value={formatCurrency(farmerTotalBilled)}
                    color="blue"
                    icon={<Receipt size={18} />}
                  />

                  <SummaryCard
                    title="Total Paid"
                    value={formatCurrency(farmerTotalPaid)}
                    color="green"
                    icon={<CheckCircle2 size={18} />}
                  />

                  <SummaryCard
                    title="Total Due"
                    value={formatCurrency(farmerTotalDue)}
                    color="red"
                    icon={<AlertCircle size={18} />}
                  />

                  <SummaryCard
                    title="Available Advance"
                    value={formatCurrency(existingAdvance)}
                    color="amber"
                    icon={<Wallet size={18} />}
                  />

                </div>

                {/* ADVANCE BALANCE */}

                <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 sm:flex-row sm:items-center">

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Wallet size={22} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Existing Advance Balance
                      </p>

                      <p className="text-xs text-amber-700">
                        Available credit for future work adjustment
                      </p>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-amber-900">
                    {formatCurrency(existingAdvance)}
                  </h2>

                </div>

              </div>
            )}

            {/* WORK */}

            <div className="sm:col-span-2">
              <Field label="Work (with outstanding due)">

                <select
                  value={workId}
                  onChange={(e) => {
                    setWorkId(e.target.value);
                    setAmount("");
                  }}
                  disabled={loadingWorks || works.length === 0}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="">
                    {loadingWorks
                      ? "Loading works..."
                      : works.length === 0
                      ? "No due works for this farmer"
                      : "Select Work"}
                  </option>

                  {works.map((work) => (
                    <option key={work._id} value={work._id}>
                      {work.workType || work.type || "Work"} — Due{" "}
                      {formatCurrency(work.dueAmount)}
                    </option>
                  ))}
                </select>

              </Field>
            </div>

            {/* SELECTED WORK DETAILS */}

            {selectedWork && (
              <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <div className="mb-3 flex items-center gap-2">
                  <Receipt size={18} className="text-slate-600" />

                  <h3 className="font-semibold text-slate-800">
                    Selected Work Details
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

                  <DetailItem
                    label="Work Amount"
                    value={formatCurrency(workTotalAmount)}
                  />

                  <DetailItem
                    label="Already Paid"
                    value={formatCurrency(workPaidAmount)}
                  />

                  <DetailItem
                    label="Remaining Due"
                    value={formatCurrency(dueAmount)}
                    color="red"
                  />

                  <DetailItem
                    label="Work Date"
                    value={getDate(
                      selectedWork.date || selectedWork.startTime
                    )}
                  />

                </div>

              </div>
            )}

            {/* PAYMENT AMOUNT */}

            <div>
              <Field label="Payment Amount">

                <div className="relative">
                  <IndianRupee
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className={`w-full rounded-2xl border bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-4 ${
                      amountInvalid
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                    }`}
                  />
                </div>

                {amountInvalid && (
                  <p className="mt-1 text-xs text-rose-600">
                    Enter a valid amount greater than zero.
                  </p>
                )}

                {/* QUICK AMOUNT BUTTONS */}

                {selectedWork && (
                  <div className="mt-2 flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={() => setAmount(String(dueAmount))}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Pay Full Due
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAmount(String(Math.ceil(dueAmount / 2)))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Pay Half
                    </button>

                  </div>
                )}

              </Field>
            </div>

            {/* PAYMENT METHOD */}

            <div>
              <Field label="Payment Method">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* OVERPAYMENT WARNING */}

            {isOverpayment && (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <AlertCircle size={18} />
                  Extra Payment Detected
                </div>

                <p className="mt-2 text-sm text-amber-700">
                  You are paying more than the current work due.
                  The extra amount will be saved as farmer advance.
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-amber-700">
                    Extra Amount
                  </span>

                  <span className="font-bold text-amber-900">
                    {formatCurrency(newAdvance)}
                  </span>
                </div>

              </div>
            )}

            {/* PAYMENT SUMMARY */}

            {selectedWork &&
              amount !== "" &&
              !amountInvalid && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">

                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp
                      size={18}
                      className="text-emerald-600"
                    />

                    <h3 className="font-semibold text-slate-800">
                      Payment Breakdown
                    </h3>
                  </div>

                  <div className="space-y-3 text-sm">

                    <BreakdownRow
                      label="Total Cash Received"
                      value={formatCurrency(numericAmount)}
                    />

                    <BreakdownRow
                      label="Applied to Current Work"
                      value={formatCurrency(appliedAmount)}
                      color="green"
                    />

                    <BreakdownRow
                      label="Remaining Work Due"
                      value={formatCurrency(remainingDue)}
                      color="red"
                    />

                    {newAdvance > 0 && (
                      <BreakdownRow
                        label="New Advance Created"
                        value={formatCurrency(newAdvance)}
                        color="amber"
                      />
                    )}

                    <div className="border-t border-slate-100 pt-3">

                      <BreakdownRow
                        label="Existing Advance"
                        value={formatCurrency(existingAdvance)}
                      />

                      <BreakdownRow
                        label="Estimated Advance Balance"
                        value={formatCurrency(estimatedAdvance)}
                        color="amber"
                        bold
                      />

                    </div>

                  </div>

                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    This is a preview. The saved balance will be
                    calculated by the backend payment controller.
                    Existing advance is displayed separately and is
                    not automatically deducted from this work here.
                  </p>

                </div>
              )}

            {/* NOTE */}

            <div className="sm:col-span-2">
              <Field label="Payment Notes (optional)">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Example: Received payment through UPI"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </Field>
            </div>

            {/* BUTTONS */}

            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">

              <PrimaryButton
                type="submit"
                disabled={!canSubmit}
                className="flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}

                {submitting ? "Saving Payment..." : "Save Payment"}
              </PrimaryButton>

              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

            </div>

          </form>
        </Card>
      </div>

      {/* TOAST */}

      {toast && (
        <div
          className={`fixed bottom-6 right-4 z-50 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg sm:right-8 ${
            toast.type === "success"
              ? "bg-emerald-600"
              : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertCircle size={17} />
          )}

          {toast.message}
        </div>
      )}

    </div>
  );
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-rose-50 border-rose-100 text-rose-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${colors[color]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium opacity-80">
          {title}
        </p>

        {icon}
      </div>

      <p className="mt-2 break-words text-base font-bold sm:text-lg">
        {value}
      </p>
    </div>
  );
}

// --------------------------------------------------
// DETAIL ITEM
// --------------------------------------------------

function DetailItem({ label, value, color = "default" }) {
  const textColor =
    color === "red" ? "text-rose-600" : "text-slate-800";

  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>

      <p className={`mt-1 text-sm font-semibold ${textColor}`}>
        {value}
      </p>
    </div>
  );
}

// --------------------------------------------------
// BREAKDOWN ROW
// --------------------------------------------------

function BreakdownRow({
  label,
  value,
  color = "default",
  bold = false,
}) {
  const colors = {
    default: "text-slate-800",
    green: "text-emerald-600",
    red: "text-rose-600",
    amber: "text-amber-700",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>

      <span
        className={`${colors[color]} ${
          bold ? "font-bold" : "font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
