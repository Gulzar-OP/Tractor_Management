import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Play,
  Pause,
  Square,
  Clock,
  IndianRupee,
  Tractor,
  RefreshCw,
  User,
  CalendarDays,
  MapPin,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Sprout,
  XCircle,
  ChevronDown,
  Hourglass,
  Info,
} from "lucide-react";

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${BASE_URL}/api/work`;
const FARMER_API = `${BASE_URL}/api/farmer`;
const WORK_RATE_API = `${BASE_URL}/api/rate`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const normalizeStatus = (status) => String(status || "").toUpperCase();

const displayStatus = (status) =>
  normalizeStatus(status) === "STOPPED" ? "COMPLETED" : normalizeStatus(status);

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
};

const formatDate = (date) => {
  if (!date) return "Current session";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Current session";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getFarmerName = (farmer) => {
  if (!farmer || typeof farmer === "string") return "Unknown Farmer";
  return farmer.name || farmer.fullName || farmer.farmerName || "Unknown Farmer";
};

const getRateName = (rate) => {
  if (!rate) return "";
  if (typeof rate === "string") return rate;
  return rate.name || rate.type || rate.workType || rate.title || "Work Rate";
};

const getRateAmount = (rate) => {
  if (!rate) return 0;
  return Number(rate.rate || rate.ratePerHour || rate.amount || 0);
};

const STATUS_STYLES = {
  RUNNING: {
    pill: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  PAUSED: {
    pill: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
    dot: "bg-amber-400",
  },
  IDLE: {
    pill: "bg-slate-200 text-slate-600 ring-slate-300",
    dot: "bg-slate-400",
  },
};

const inputCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3.5 pl-11 pr-4 text-sm font-medium text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Works() {
  const [farmers, setFarmers] = useState([]);
  const [workRates, setWorkRates] = useState([]);
  const [activeWork, setActiveWork] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "stop" | "cancel" | null

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [timerForm, setTimerForm] = useState({
    farmerId: "",
    fieldName: "",
    workRate: "",
    date: getToday(),
  });

  const status = normalizeStatus(activeWork?.status);
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f._id === timerForm.farmerId) || null,
    [farmers, timerForm.farmerId]
  );

  const selectedRate = useMemo(
    () => workRates.find((r) => r._id === timerForm.workRate) || null,
    [workRates, timerForm.workRate]
  );

  /* ---------------- Live timer (ticks only while RUNNING) ---------------- */

  useEffect(() => {
    if (!isRunning) return undefined;

    setCurrentTime(Date.now());
    const id = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning, activeWork?._id]);

  const timerSeconds = useMemo(() => {
    if (!activeWork) return 0;

    const accumulated = Number(activeWork.totalMinutes || 0) * 60;

    if (isRunning) {
      const resumedAt = activeWork.lastResumeTime
        ? new Date(activeWork.lastResumeTime).getTime()
        : currentTime;
      const session = Math.max(0, Math.floor((currentTime - resumedAt) / 1000));
      return accumulated + session;
    }

    return accumulated;
  }, [activeWork, isRunning, currentTime]);

  const liveMinutes = Math.floor(timerSeconds / 60);
  const activeRate = Number(activeWork?.ratePerHour || 0);
  // Computed from seconds so the amount moves smoothly instead of per-minute jumps
  const estimatedAmount = Math.round((timerSeconds / 3600) * activeRate);

  /* ---------------- Resolve display names for the active work ---------------- */

  const activeFarmerName = useMemo(() => {
    const f = activeWork?.farmer;
    if (!f) return "Unknown Farmer";
    if (typeof f === "string") {
      const found = farmers.find((x) => x._id === f);
      return found ? getFarmerName(found) : "Unknown Farmer";
    }
    return getFarmerName(f);
  }, [activeWork?.farmer, farmers]);

  const activeWorkType = useMemo(() => {
    if (activeWork?.workType) return activeWork.workType;
    const r = activeWork?.workRate;
    if (r && typeof r === "object") return getRateName(r);
    if (typeof r === "string") {
      const found = workRates.find((x) => x._id === r);
      if (found) return getRateName(found);
    }
    return "-";
  }, [activeWork, workRates]);

  /* ---------------- API ---------------- */

  const fetchWorks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/all-works`, { withCredentials: true });

      const data =
        res.data.works || res.data.data || res.data.workHistory || [];
      const works = Array.isArray(data) ? data : [];

      const running = works.find((w) => normalizeStatus(w.status) === "RUNNING");
      const paused = works.find((w) => normalizeStatus(w.status) === "PAUSED");

      setActiveWork(running || paused || null);
    } catch (error) {
      console.error("Fetch active work error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch current work");
    }
  }, []);

  const fetchFarmers = useCallback(async () => {
    try {
      const res = await axios.post(
        `${FARMER_API}/all-farmer`,
        {},
        { withCredentials: true }
      );

      const data =
        res.data.farmers || res.data.all || res.data.data || res.data;
      setFarmers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch farmers error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch farmers");
    }
  }, []);

  const fetchWorkRates = useCallback(async () => {
    try {
      const res = await axios.get(`${WORK_RATE_API}/rates`, {
        withCredentials: true,
      });

      const data =
        res.data.workRates || res.data.rates || res.data.data || res.data;
      setWorkRates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch work rates error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch work rates");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchWorks(), fetchFarmers(), fetchWorkRates()]);
      setLoading(false);
    };
    load();
  }, [fetchWorks, fetchFarmers, fetchWorkRates]);

  /* ---------------- Actions ---------------- */

  const handleStartWork = async (e) => {
    e.preventDefault();
    if (actionLoading) return;

    if (!timerForm.farmerId) return toast.error("Please select a farmer");
    if (!timerForm.workRate) return toast.error("Please select a work rate");
    if (!timerForm.fieldName.trim()) return toast.error("Please enter field name");
    if (activeWork) return toast.error("A work is already running or paused");

    try {
      setActionLoading(true);

      const res = await axios.post(
        `${API}/start`,
        {
          farmerId: timerForm.farmerId,
          fieldName: timerForm.fieldName.trim(),
          workRate: timerForm.workRate,
          date: timerForm.date,
        },
        { withCredentials: true }
      );

      toast.success(res.data?.message || "Work started successfully");

      setTimerForm({
        farmerId: "",
        fieldName: "",
        workRate: "",
        date: getToday(),
      });

      await fetchWorks();
    } catch (error) {
      console.error("Start work error:", error);
      toast.error(error.response?.data?.message || "Failed to start work");
    } finally {
      setActionLoading(false);
    }
  };

  // One shared handler for pause / resume / stop / cancel
  const runAction = async (path, successMsg, errorMsg, finishes = false) => {
    if (!activeWork || actionLoading) return;

    try {
      setActionLoading(true);

      const res = await axios.post(
        `${API}/${activeWork._id}/${path}`,
        {},
        { withCredentials: true }
      );

      toast.success(res.data?.message || successMsg);

      if (finishes) {
        setActiveWork(null);
        await Promise.all([fetchWorks(), fetchFarmers()]);
      } else {
        await fetchWorks();
      }
    } catch (error) {
      console.error(`${path} work error:`, error);
      toast.error(error.response?.data?.message || errorMsg);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handlePause = () =>
    runAction("pause", "Work paused", "Failed to pause work");
  const handleResume = () =>
    runAction("resume", "Work resumed", "Failed to resume work");
  const handleStop = () =>
    runAction("stop", "Work completed successfully", "Failed to complete work", true);
  const handleCancel = () =>
    runAction("cancel", "Work cancelled successfully", "Failed to cancel work", true);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchWorks(), fetchFarmers(), fetchWorkRates()]);
      toast.success("Data refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const setField = (key) => (e) =>
    setTimerForm((prev) => ({ ...prev, [key]: e.target.value }));

  /* ---------------- Loading ---------------- */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lg shadow-emerald-900/10">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="font-bold text-stone-800">Loading Work Management</p>
            <p className="mt-1 text-sm text-stone-400">
              Fetching your current farm activity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pillStyle = STATUS_STYLES[isRunning ? "RUNNING" : isPaused ? "PAUSED" : "IDLE"];

  /* ---------------- Main ---------------- */

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Sprout size={14} />
              Farm Operations
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900">
              Work Management
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Track your tractor sessions live, from start to payment.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || actionLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-emerald-50 hover:ring-emerald-200 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* ================= ACTIVE WORK ================= */}
        {activeWork ? (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Timer card */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8 lg:col-span-3">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ${pillStyle.pill}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${pillStyle.dot} ${
                        isRunning ? "animate-pulse" : ""
                      }`}
                    />
                    {displayStatus(activeWork.status)}
                  </span>

                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-100/70">
                    <CalendarDays size={14} />
                    {formatDate(activeWork.date)}
                  </span>
                </div>

                {/* Ring + time */}
                <div className="my-8 flex justify-center">
                  <TimerRing seconds={timerSeconds} running={isRunning}>
                    <span className="font-mono text-4xl font-extrabold tracking-wider sm:text-5xl">
                      {formatDuration(timerSeconds)}
                    </span>
                    <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-200/60">
                      {isRunning ? "Live timer" : "Timer paused"}
                    </span>
                  </TimerRing>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <TimerStat label="Minutes" value={liveMinutes} />
                  <TimerStat label="Rate / hr" value={formatCurrency(activeRate)} />
                  <TimerStat
                    label="Earned"
                    value={formatCurrency(estimatedAmount)}
                    highlight
                  />
                </div>

                {/* Controls */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {isRunning && (
                    <button
                      disabled={actionLoading}
                      onClick={handlePause}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 text-sm font-extrabold text-amber-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Pause size={18} />
                      {actionLoading ? "Processing..." : "Pause"}
                    </button>
                  )}

                  {isPaused && (
                    <button
                      disabled={actionLoading}
                      onClick={handleResume}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Play size={18} />
                      {actionLoading ? "Processing..." : "Resume"}
                    </button>
                  )}

                  <button
                    disabled={actionLoading}
                    onClick={() => setConfirmAction("stop")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-emerald-900 shadow-lg shadow-black/10 transition hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Square size={17} />
                    Complete
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => setConfirmAction("cancel")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-rose-200 ring-1 ring-rose-300/30 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <XCircle size={17} />
                    Cancel
                  </button>
                </div>
              </div>
            </section>

            {/* Details */}
            <aside className="space-y-4 lg:col-span-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                  Session Details
                </h2>

                <div className="mt-4 space-y-3">
                  <DetailRow icon={User} label="Farmer" value={activeFarmerName} />
                  <DetailRow
                    icon={MapPin}
                    label="Field / Location"
                    value={activeWork.fieldName || "-"}
                  />
                  <DetailRow icon={Tractor} label="Work Type" value={activeWorkType} />
                  <DetailRow
                    icon={IndianRupee}
                    label="Hourly Rate"
                    value={`${formatCurrency(activeRate)}/hr`}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-100">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-sky-600" />
                <p className="text-sm leading-relaxed text-sky-900">
                  When you complete this work, the farmer's available advance is
                  adjusted automatically. Pausing and resuming updates the
                  working duration accordingly.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          /* ================= START NEW WORK ================= */
          <div className="grid gap-6 lg:grid-cols-5">
            <section className="overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 lg:col-span-3">
              <div className="flex items-center gap-4 border-b border-stone-100 bg-gradient-to-r from-emerald-50 to-white p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                  <Play size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900">
                    Start New Work
                  </h2>
                  <p className="mt-0.5 text-sm text-stone-500">
                    Pick a farmer and rate, then start the timer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleStartWork} className="space-y-5 p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Farmer" icon={User}>
                    <select
                      value={timerForm.farmerId}
                      onChange={setField("farmerId")}
                      className={`${inputCls} appearance-none`}
                      required
                    >
                      <option value="">Choose a farmer</option>
                      {farmers.map((farmer) => (
                        <option key={farmer._id} value={farmer._id}>
                          {getFarmerName(farmer)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                  </FormField>

                  <FormField label="Work Rate" icon={IndianRupee}>
                    <select
                      value={timerForm.workRate}
                      onChange={setField("workRate")}
                      className={`${inputCls} appearance-none`}
                      required
                    >
                      <option value="">Choose a work rate</option>
                      {workRates.map((rate) => (
                        <option key={rate._id} value={rate._id}>
                          {getRateName(rate)} — {formatCurrency(getRateAmount(rate))}/hr
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                  </FormField>

                  <FormField label="Field / Location" icon={MapPin}>
                    <input
                      type="text"
                      value={timerForm.fieldName}
                      onChange={setField("fieldName")}
                      placeholder="e.g. North field, Plot 2"
                      className={inputCls}
                      required
                    />
                  </FormField>

                  <FormField label="Work Date" icon={CalendarDays}>
                    <input
                      type="date"
                      value={timerForm.date}
                      onChange={setField("date")}
                      className={inputCls}
                      required
                    />
                  </FormField>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <button
                    type="submit"
                    disabled={actionLoading || !farmers.length || !workRates.length}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={18} />
                    {actionLoading ? "Starting Work..." : "Start Work Timer"}
                  </button>

                  {!farmers.length && (
                    <p className="mt-3 text-center text-xs font-medium text-rose-500">
                      No farmers found. Please add a farmer first.
                    </p>
                  )}
                  {farmers.length > 0 && !workRates.length && (
                    <p className="mt-3 text-center text-xs font-medium text-rose-500">
                      No work rates found. Please add a work rate first.
                    </p>
                  )}
                </div>
              </form>
            </section>

            {/* Preview side */}
            <aside className="space-y-4 lg:col-span-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${STATUS_STYLES.IDLE.pill}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    NO ACTIVE WORK
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                  <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">
                      Ready for a new session
                    </p>
                    <p className="text-xs text-emerald-700">
                      No running or paused work found.
                    </p>
                  </div>
                </div>

                <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-stone-400">
                  Session Preview
                </h3>

                <div className="space-y-3">
                  <DetailRow
                    icon={User}
                    label="Farmer"
                    value={selectedFarmer ? getFarmerName(selectedFarmer) : "Not selected"}
                    muted={!selectedFarmer}
                  />
                  <DetailRow
                    icon={Tractor}
                    label="Work Type"
                    value={selectedRate ? getRateName(selectedRate) : "Not selected"}
                    muted={!selectedRate}
                  />
                  <DetailRow
                    icon={IndianRupee}
                    label="Hourly Rate"
                    value={
                      selectedRate
                        ? `${formatCurrency(getRateAmount(selectedRate))}/hr`
                        : "-"
                    }
                    muted={!selectedRate}
                  />
                </div>

                {selectedFarmer && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 p-4 text-white shadow-lg shadow-amber-500/20">
                    <div className="flex items-center gap-3">
                      <Wallet size={20} />
                      <div>
                        <p className="text-sm font-bold">Available Advance</p>
                        <p className="text-xs text-amber-50/90">
                          Auto-adjusted on completion
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-extrabold">
                      {formatCurrency(selectedFarmer.advanceAmount || 0)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
                <Info size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-xs leading-relaxed text-stone-500">
                  The timer tracks elapsed time automatically. Pause whenever the
                  tractor stops temporarily, and resume when work continues.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <ConfirmDialog
          kind={confirmAction}
          loading={actionLoading}
          onClose={() => !actionLoading && setConfirmAction(null)}
          onConfirm={confirmAction === "stop" ? handleStop : handleCancel}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UI components                                                       */
/* ------------------------------------------------------------------ */

function TimerRing({ seconds, running, children }) {
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  // The arc sweeps once per minute
  const progress = (seconds % 60) / 60;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
      <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-white/10"
        />
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-1000 ease-linear ${
            running ? "stroke-emerald-400" : "stroke-amber-400"
          }`}
        />
      </svg>
      <div className="relative flex flex-col items-center text-center">{children}</div>
    </div>
  );
}

function TimerStat({ label, value, highlight = false }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-center ring-1 ring-white/10">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/60">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-extrabold tabular-nums ${
          highlight ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, muted = false }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-400">{label}</p>
        <p
          className={`truncate text-sm font-bold ${
            muted ? "text-stone-400" : "text-stone-800"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function FormField({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-stone-700">{label}</span>
      <div className="relative">
        <Icon
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-stone-400"
        />
        {children}
      </div>
    </label>
  );
}

function ConfirmDialog({ kind, loading, onClose, onConfirm }) {
  const isStop = kind === "stop";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            isStop ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
          }`}
        >
          {isStop ? <Hourglass size={22} /> : <XCircle size={22} />}
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-stone-900">
          {isStop ? "Complete this work?" : "Cancel this work?"}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
          {isStop
            ? "The timer will stop and any available farmer advance will be adjusted automatically."
            : "This session will be cancelled. This action cannot be undone."}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
          >
            Keep working
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-50 ${
              isStop
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {loading ? "Please wait..." : isStop ? "Complete work" : "Cancel work"}
          </button>
        </div>
      </div>
    </div>
  );
}