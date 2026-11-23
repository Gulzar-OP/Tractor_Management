import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import {
  Phone,
  MapPin,
  Calendar,
  ClipboardList,
  Clock,
  User,
  ArrowLeft,
  FileText,
  X,
  CreditCard,
  CheckCircle2,
  Truck,
  Wallet,
  Receipt,
  BadgeIndianRupee,
  AlertCircle,
  Layers,
  Banknote,
  Timer,
} from "lucide-react";

import Badge from "../../components/UI/Badge";
import PrimaryButton from "../../components/UI/PrimaryButton";

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateTimestamp = (date) => {
  if (!date) return null;

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate.getTime();
};

const getLocalDateBoundary = (date, end = false) => {
  if (!date) return null;

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(
    year,
    month - 1,
    day,
    end ? 23 : 0,
    end ? 59 : 0,
    end ? 59 : 0,
    end ? 999 : 0
  ).getTime();
};

const formatWorkTime = (totalMinutes = 0) => {
  const minutes = Math.max(0, Number(totalMinutes || 0));

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
};

const getWorkAmounts = (work) => {
  const total = Math.max(0, Number(work?.totalAmount || 0));
  const paid = Math.max(0, Number(work?.paidAmount || 0));
  const advance = Math.max(
    0,
    Number(work?.advanceAppliedAmount || 0)
  );

  // paidAmount includes advance adjustment in this accounting model.
  const directPaid = Math.max(0, paid - advance);
  const settled = Math.min(total, paid);
  const due = Math.max(
    0,
    Number(work?.dueAmount ?? total - settled)
  );

  return {
    total,
    paid,
    advance,
    directPaid,
    settled,
    due,
  };
};

/* ---------- Small presentational helpers ---------- */

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "slate",
  hint,
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    green: "bg-green-100 text-green-700",
    rose: "bg-rose-100 text-rose-600",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
  };

  const valueTones = {
    slate: "text-slate-900",
    emerald: "text-slate-900",
    green: "text-green-700",
    rose: "text-rose-600",
    amber: "text-amber-600",
    blue: "text-blue-700",
    orange: "text-orange-700",
  };

  return (
    <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon size={16} />
        </span>

        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
          {label}
        </span>
      </div>

      <p
        className={`mt-3 break-words text-xl font-bold tabular-nums sm:text-2xl ${valueTones[tone]}`}
      >
        {value}
      </p>

      {hint && (
        <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

function Donut({ percent }) {
  const safePercent = Math.min(
    100,
    Math.max(0, Number(percent || 0))
  );

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative h-36 w-36">
      <svg
        viewBox="0 0 128 128"
        className="h-full w-full -rotate-90"
      >
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-slate-100"
        />

        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-emerald-500 transition-all duration-700"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">
          {safePercent}%
        </span>

        <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
          Settled
        </span>
      </div>
    </div>
  );
}

function SideRow({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-3 text-sm text-slate-700">
      <Icon
        size={16}
        className="mt-0.5 shrink-0 text-emerald-600"
      />

      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/* ---------- Page ---------- */

export default function FarmerDetails() {
  const { farmerId } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  /* ---------- Fetch Farmer ---------- */

  const fetchDetails = useCallback(
    async (signal) => {
      if (!farmerId) {
        setFarmer(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const res = await axios.get(
          `${API}/farmer/${farmerId}`,
          {
            withCredentials: true,
            signal,
          }
        );

        setFarmer(
          res.data?.farmer || res.data || null
        );
      } catch (error) {
        if (
          error.code === "ERR_CANCELED" ||
          error.name === "CanceledError"
        ) {
          return;
        }

        console.error("Farmer fetch error:", error);

        toast.error(
          error.response?.data?.message ||
            "Failed to fetch farmer"
        );

        setFarmer(null);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [farmerId]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchDetails(controller.signal);

    return () => controller.abort();
  }, [fetchDetails]);

  /* ---------- Farmer Summary ---------- */

  const initials = useMemo(() => {
    const name = farmer?.name || "";

    return name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [farmer?.name]);

  const works = farmer?.works || [];

  const totalWorks = works.length;

  const dueAmount = Math.max(
    0,
    Number(farmer?.totalDueAmount || 0)
  );

  const settledAmount = Math.max(
    0,
    Number(farmer?.totalPaidAmount || 0)
  );

  const billedAmount = Math.max(
    0,
    Number(farmer?.totalBilledAmount || 0)
  );

  const advanceAmount = Math.max(
    0,
    Number(farmer?.advanceAmount || 0)
  );

  // Total accumulated work minutes
  const totalWorkMinutes = Math.max(
    0,
    Number(farmer?.totalWorkMinutes || 0)
  );

  const totalWorkHours = Math.floor(
    totalWorkMinutes / 60
  );

  const remainingWorkMinutes =
    totalWorkMinutes % 60;

  const formattedTotalWorkTime =
    formatWorkTime(totalWorkMinutes);

  // Advance already used against work records.
  const totalAdvanceApplied = works.reduce(
    (sum, work) =>
      sum +
      Math.max(
        0,
        Number(work?.advanceAppliedAmount || 0)
      ),
    0
  );

  // Direct payment excludes advance adjustment.
  const directPaidAmount = Math.max(
    0,
    settledAmount - totalAdvanceApplied
  );

  const status =
    dueAmount > 0
      ? settledAmount > 0
        ? "Partial"
        : "Due"
      : advanceAmount > 0
        ? "Advance"
        : "Paid";

  const paidPercent =
    billedAmount > 0
      ? Math.min(
          100,
          Math.round(
            (settledAmount / billedAmount) * 100
          )
        )
      : 0;

  /* ---------- Filters ---------- */

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => {
      if (name === "startDate") {
        return {
          ...prev,
          startDate: value,
          endDate:
            prev.endDate && value > prev.endDate
              ? ""
              : prev.endDate,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
    });
  };

  const hasFilters = Boolean(
    filters.startDate || filters.endDate
  );

  const filteredWorks = useMemo(() => {
    const start = getLocalDateBoundary(
      filters.startDate,
      false
    );

    const end = getLocalDateBoundary(
      filters.endDate,
      true
    );

    return [...works]
      .filter((work) => {
        if (start === null && end === null) {
          return true;
        }

        const workDate = getDateTimestamp(work?.date);

        if (workDate === null) return false;

        if (start !== null && workDate < start) {
          return false;
        }

        if (end !== null && workDate > end) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = getDateTimestamp(a?.date) || 0;
        const dateB = getDateTimestamp(b?.date) || 0;

        return dateB - dateA;
      });
  }, [works, filters.startDate, filters.endDate]);

  // Total minutes for currently filtered work records
  const filteredTotalMinutes = useMemo(() => {
    return filteredWorks.reduce(
      (sum, work) =>
        sum + Math.max(0, Number(work?.totalMinutes || 0)),
      0
    );
  }, [filteredWorks]);

  /* ---------- Payment Navigation ---------- */

  const handlePayClick = (work) => {
    const amounts = getWorkAmounts(work);

    if (amounts.due <= 0) {
      toast.error("This work is already settled.");
      return;
    }

    navigate("/payments", {
      state: {
        workId: work._id,
        farmerID: farmer?._id,
        driverID: work.driverID || work.createdBy,
        farmerName: farmer?.name,
        workType: work.workType || work.type,
        dueAmount: amounts.due,
        totalAmount: amounts.total,
      },
    });
  };

  const handleRecordPayment = () => {
    if (dueAmount <= 0) {
      toast.error("There is no outstanding due.");
      return;
    }

    navigate("/payments", {
      state: {
        farmerID: farmer?._id,
        farmerName: farmer?.name,
        dueAmount,
      },
    });
  };

  const lastWorkDate =
    farmer?.lastWorkDate ||
    filteredWorks[0]?.date ||
    works[0]?.date;

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="h-64 animate-pulse bg-emerald-900/80" />

        <div className="mx-auto -mt-12 max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-white shadow"
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="h-96 animate-pulse rounded-3xl bg-white shadow" />

            <div className="h-96 animate-pulse rounded-3xl bg-white shadow" />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Not Found ---------- */

  if (!farmer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-900/5">
          <User className="mx-auto h-12 w-12 text-slate-300" />

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Farmer Not Found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Farmer details could not be loaded.
          </p>

          <PrimaryButton
            onClick={() => navigate("/farmers")}
            className="mt-6 inline-flex items-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Farmers
          </PrimaryButton>
        </div>
      </div>
    );
  }

  /* ---------- Main ---------- */

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {/* HERO */}

      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 pb-20 pt-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/farmers")}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-emerald-50 backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft size={15} />
            All Farmers
          </button>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-emerald-800 shadow-2xl shadow-black/20 sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">
                {initials || <User />}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {farmer.name || "Unnamed Farmer"}
                  </h1>

                  <Badge status={status} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-emerald-100/90">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} />
                    {farmer.village || "Village not available"}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} />
                    {farmer.phone || "-"}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    Last work: {formatDate(lastWorkDate)}
                  </span>
                </div>
              </div>
            </div>

            {dueAmount > 0 && (
              <button
                onClick={handleRecordPayment}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-xl shadow-black/20 transition hover:bg-emerald-50 active:scale-[0.98]"
              >
                <CreditCard size={17} />
                Record Payment
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* STAT STRIP */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 lg:gap-4">
          <StatTile
            icon={Layers}
            label="Works"
            value={totalWorks}
            tone="slate"
          />

          <StatTile
            icon={Receipt}
            label="Billed"
            value={formatCurrency(billedAmount)}
            tone="emerald"
          />

          <StatTile
            icon={Banknote}
            label="Direct Paid"
            value={formatCurrency(directPaidAmount)}
            tone="blue"
            hint="Actual payments"
          />

          <StatTile
            icon={BadgeIndianRupee}
            label="Advance Used"
            value={formatCurrency(totalAdvanceApplied)}
            tone="green"
            hint="Adjusted in works"
          />

          <StatTile
            icon={AlertCircle}
            label="Due"
            value={formatCurrency(dueAmount)}
            tone="rose"
          />

          <StatTile
            icon={Wallet}
            label="Available Advance"
            value={formatCurrency(advanceAmount)}
            tone="amber"
            hint="Remaining credit"
          />

          {/* NEW: TOTAL WORK TIME */}

          <StatTile
            icon={Clock}
            label="Total Work Time"
            value={formattedTotalWorkTime}
            tone="orange"
            hint={`${totalWorkMinutes.toLocaleString("en-IN")} total minutes`}
          />
        </div>

        {/* BODY */}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          {/* WORK RECORDS */}

          <section className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Work Records
                  </h2>

                  <p className="text-sm text-slate-500">
                    Every job done for this farmer, newest first
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {filteredWorks.length} record
                  {filteredWorks.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* DATE FILTER */}

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-2">
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-400">
                  <Calendar
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    aria-label="Start date"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none"
                  />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  to
                </span>

                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-400">
                  <Calendar
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    min={filters.startDate || undefined}
                    aria-label="End date"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none"
                  />
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <X size={14} />
                    Clear
                  </button>
                )}
              </div>

              {/* FILTERED WORK TIME */}

              {hasFilters && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2.5 text-emerald-600">
                      <Timer size={18} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-emerald-700">
                        Work Time in Selected Period
                      </p>

                      <p className="text-lg font-bold text-emerald-900">
                        {formatWorkTime(filteredTotalMinutes)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-emerald-600">
                      Total Minutes
                    </p>

                    <p className="font-bold text-emerald-800">
                      {filteredTotalMinutes.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* WORK ROWS */}

            <div className="divide-y divide-slate-100">
              {filteredWorks.length ? (
                filteredWorks.map((work, index) => {
                  const {
                    total: workTotal,
                    advance: workAdvance,
                    directPaid,
                    settled,
                    due: workDue,
                  } = getWorkAmounts(work);

                  const workPercent =
                    workTotal > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (settled / workTotal) * 100
                          )
                        )
                      : 0;

                  const isPaid = workDue <= 0;

                  return (
                    <div
                      key={work._id || index}
                      className="relative flex flex-col gap-4 p-5 pl-6 transition hover:bg-emerald-50/40 sm:p-6 sm:pl-7 lg:flex-row lg:items-center"
                    >
                      {/* STATUS STRIPE */}

                      <span
                        className={`absolute inset-y-0 left-0 w-1.5 ${
                          isPaid
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                        }`}
                      />

                      {/* LEFT: WORK INFO */}

                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                          <ClipboardList size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-base font-bold text-slate-900">
                              {work.workType || work.type || "Work"}
                            </h3>

                            <Badge
                              status={
                                work.paymentStatus ||
                                (isPaid
                                  ? "Paid"
                                  : settled > 0
                                    ? "Partial"
                                    : "Due")
                              }
                            />
                          </div>

                          <p className="mt-0.5 text-sm text-slate-500">
                            {work.fieldName || "Field not specified"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(work.date)}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {Number(work.totalMinutes || 0)} min
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <User size={12} />
                              {work.status || "-"}
                            </span>

                            <span>
                              {formatCurrency(work.ratePerHour)}/hr
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* MIDDLE: FINANCIAL DETAILS */}

                      <div className="w-full lg:w-64 lg:shrink-0">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div>
                            <p className="text-slate-400">
                              Total
                            </p>

                            <p className="font-bold text-slate-900">
                              {formatCurrency(workTotal)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Direct paid
                            </p>

                            <p className="font-semibold text-blue-700">
                              {formatCurrency(directPaid)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Advance adjusted
                            </p>

                            <p className="font-semibold text-emerald-700">
                              {formatCurrency(workAdvance)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Remaining due
                            </p>

                            <p
                              className={`font-semibold ${
                                workDue > 0
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(workDue)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPaid
                                ? "bg-emerald-500"
                                : "bg-amber-400"
                            }`}
                            style={{
                              width: `${workPercent}%`,
                            }}
                          />
                        </div>

                        <p
                          className={`mt-1.5 text-xs font-semibold ${
                            isPaid
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {isPaid
                            ? "Fully settled"
                            : `${formatCurrency(workDue)} remaining`}
                        </p>
                      </div>

                      {/* RIGHT: ACTION */}

                      <div className="w-full lg:w-28 lg:shrink-0">
                        {isPaid ? (
                          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={14} />
                            Settled
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePayClick(work)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.97]"
                          >
                            <CreditCard size={14} />
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No work records found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {hasFilters
                      ? "Try changing the date range."
                      : "No work has been recorded for this farmer yet."}
                  </p>

                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Clear date filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* SIDEBAR */}

          <aside className="space-y-6 lg:sticky lg:top-6">
            {/* TOTAL WORK TIME OVERVIEW */}

            <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 p-6 text-white shadow-lg shadow-orange-500/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-50">
                <Clock size={17} />
                Total Work Time
              </div>

              <p className="mt-3 text-4xl font-extrabold tabular-nums">
                {formattedTotalWorkTime}
              </p>

              <p className="mt-1 text-sm text-orange-50">
                {totalWorkMinutes.toLocaleString("en-IN")} total minutes
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-xs text-orange-50">
                    Total Hours
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {totalWorkHours}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-xs text-orange-50">
                    Remaining Minutes
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {remainingWorkMinutes}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-white/20 pt-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-orange-50">
                    Average per work
                  </span>

                  <span className="font-bold">
                    {totalWorks > 0
                      ? formatWorkTime(
                          Math.round(
                            totalWorkMinutes / totalWorks
                          )
                        )
                      : "0m"}
                  </span>
                </div>
              </div>
            </div>

            {/* PAYMENT OVERVIEW */}

            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Payment Overview
              </h3>

              <div className="mt-4 flex justify-center">
                <Donut percent={paidPercent} />
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                    Direct paid
                  </dt>

                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatCurrency(directPaidAmount)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    Advance adjusted
                  </dt>

                  <dd className="font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(totalAdvanceApplied)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400" />
                    Due
                  </dt>

                  <dd className="font-semibold tabular-nums text-rose-600">
                    {formatCurrency(dueAmount)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <dt className="text-slate-500">
                    Total settled
                  </dt>

                  <dd className="font-bold tabular-nums text-slate-900">
                    {formatCurrency(settledAmount)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">
                    Total billed
                  </dt>

                  <dd className="font-bold tabular-nums text-slate-900">
                    {formatCurrency(billedAmount)}
                  </dd>
                </div>
              </dl>

              {dueAmount > 0 && (
                <button
                  onClick={handleRecordPayment}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <CreditCard size={16} />
                  Settle Due Amount
                </button>
              )}
            </div>

            {/* ADVANCE BALANCE */}

            <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-400 p-6 text-white shadow-lg shadow-amber-500/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-50">
                <Wallet size={16} />
                Advance Balance
              </div>

              <p className="mt-2 text-3xl font-extrabold tabular-nums">
                {formatCurrency(advanceAmount)}
              </p>

              <p className="mt-1 text-xs text-amber-50/90">
                {advanceAmount > 0
                  ? "Credit available for upcoming work"
                  : "No advance currently available"}
              </p>

              <div className="mt-4 border-t border-white/20 pt-3">
                <div className="flex items-center justify-between gap-3 text-xs text-amber-50">
                  <span>Already adjusted in works</span>

                  <span className="font-bold">
                    {formatCurrency(totalAdvanceApplied)}
                  </span>
                </div>
              </div>
            </div>

            {/* CONTACT + NOTES */}

            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Contact
              </h3>

              <div className="mt-4 space-y-3">
                <SideRow icon={Phone}>
                  {farmer.phone || "-"}
                </SideRow>

                <SideRow icon={MapPin}>
                  {farmer.village || "-"}
                </SideRow>
              </div>

              {farmer.notes && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <FileText
                      size={13}
                      className="text-emerald-600"
                    />
                    Notes
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                    {farmer.notes}
                  </p>
                </div>
              )}
            </div>

            {/* DRIVER */}

            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
              <Truck className="mx-auto h-7 w-7 text-slate-300" />

              <p className="mt-2 text-sm font-semibold text-slate-600">
                Assigned driver unavailable
              </p>

              <p className="mt-1 text-xs text-slate-400">
                A valid driver ID is required to show driver details.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}