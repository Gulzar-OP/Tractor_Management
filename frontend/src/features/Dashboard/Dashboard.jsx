import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Users as UsersIcon,
  ClipboardCheck,
  Clock,
  Sprout,
  LogIn,
  ArrowRight,
  Wallet,
  Receipt,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { getAllFarmers } from "../../redux/slice/farmerSlice";

import MonthlyChart from "./MonthlyChart";
import ExpensePie from "./ExpensePie";
import RecentWorkTable from "./RecentWorkTable";
import QuickActions from "./QuickAction";
import { inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, "0");

// Local-time keys (toISOString() is UTC and shifts the day for IST users)
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const isCancelled = (w) => String(w?.status || "").toUpperCase() === "CANCELLED";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Same auth shape used in Topbar: { role, data: {...} }
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const isLoggedIn = Boolean(user);
  const userName = user?.data?.name || user?.data?.fullName || user?.name || "";

  const [works, setWorks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [workRes, expenseRes] = await Promise.all([
        axios.get(`${API}/work/all-works`, { withCredentials: true }),
        axios.get(`${API}/expenses/all-expenses`, { withCredentials: true }),
      ]);

      const workList = workRes.data?.works || workRes.data?.all || [];
      const expenseList = expenseRes.data?.expenses || [];

      setWorks(Array.isArray(workList) ? workList : []);
      setExpenses(Array.isArray(expenseList) ? expenseList : []);
    } catch (err) {
      console.error("Dashboard fetch failed:", err.response?.status, err.response?.data);

      setError(
        err.response?.status === 401
          ? "Session expired — please log in again."
          : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Only hit the backend once we know there's a logged-in user,
  // otherwise it just produces guaranteed 401s.
  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      setLoading(false);
      return;
    }
    dispatch(getAllFarmers());
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn]);

  /* ---------------- Derived numbers ---------------- */

  const stats = useMemo(() => {
    const valid = works.filter((w) => !isCancelled(w));
    const today = dayKey(new Date());

    const todaysWorks = valid.filter((w) => {
      if (!w.date) return false;
      const d = new Date(w.date);
      return !Number.isNaN(d.getTime()) && dayKey(d) === today;
    });

    const todaysIncome = todaysWorks.reduce((s, w) => s + (w.paidAmount || 0), 0);
    const totalDue = valid.reduce((s, w) => s + (w.dueAmount || 0), 0);
    const totalBilled = valid.reduce((s, w) => s + (w.totalAmount || 0), 0);
    const totalPaid = valid.reduce((s, w) => s + (w.paidAmount || 0), 0);
    const pendingPayments = valid.filter((w) => (w.dueAmount || 0) > 0).length;

    const totalFarmers = new Set(
      valid
        .map((w) => w.farmer?._id || w.farmer?.toString?.() || w.farmer)
        .filter(Boolean)
    ).size;

    return {
      todaysWorks: todaysWorks.length,
      todaysIncome,
      totalDue,
      totalBilled,
      totalPaid,
      pendingPayments,
      totalFarmers,
    };
  }, [works]);

  // Chronologically sorted, keyed by yyyy-mm so ordering is always correct
  const monthlyIncomeData = useMemo(() => {
    const map = {};

    works.forEach((work) => {
      if (!work.date || isCancelled(work)) return;
      const date = new Date(work.date);
      if (Number.isNaN(date.getTime())) return;

      const key = monthKey(date);
      if (!map[key]) {
        map[key] = {
          key,
          month: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
          income: 0,
        };
      }
      map[key].income += work.totalAmount || 0;
    });

    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ month, income, key }) => ({ month, income, key }));
  }, [works]);

  // The actual current month — not just "the latest month that has data"
  const currentMonthIncome = useMemo(() => {
    const key = monthKey(new Date());
    return monthlyIncomeData.find((m) => m.key === key)?.income || 0;
  }, [monthlyIncomeData]);

  const sparkValues = useMemo(
    () => monthlyIncomeData.slice(-6).map((m) => m.income),
    [monthlyIncomeData]
  );

  const expenseBreakdown = useMemo(() => {
    const map = {};

    expenses.forEach((expense) => {
      const type = expense.type || "Other";
      map[type] = (map[type] || 0) + (expense.amount || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const collectedPercent =
    stats.totalBilled > 0
      ? Math.min(100, Math.round((stats.totalPaid / stats.totalBilled) * 100))
      : 0;

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  /* ---------------- States ---------------- */

  if (authLoading || (isLoggedIn && loading)) {
    return <DashboardSkeleton />;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-stone-900/5 ring-1 ring-stone-900/5">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-lg shadow-emerald-600/30">
            <Sprout size={28} className="text-white" />
          </div>

          <h1 className="text-xl font-extrabold text-stone-900">
            Log in to see your dashboard
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Income, dues, and today&apos;s work all live here — sign in to pick up
            where you left off.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <LogIn size={16} />
            Log in
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={26} />
          </div>
          <p className="mt-4 font-bold text-stone-800">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Main ---------------- */

  return (
    <div className="space-y-6">
      {/* Top row: hero + dues */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8 lg:col-span-2">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[44px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-200/80">
                  {getGreeting()}
                  {userName ? `, ${userName.split(" ")[0]}` : ""} 👋
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Here&apos;s your tractor business today
                </h1>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-50 ring-1 ring-white/15 backdrop-blur">
                <CalendarDays size={14} />
                {todayLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                  Today&apos;s income
                </p>
                <p className="mt-2 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
                  {inr(stats.todaysIncome)}
                </p>
                <p className="mt-2 text-sm text-emerald-100/80">
                  from {stats.todaysWorks} work{stats.todaysWorks === 1 ? "" : "s"} today
                </p>
              </div>

              <div className="flex items-end gap-5">
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200/70">
                    <TrendingUp size={13} />
                    This month
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums">
                    {inr(currentMonthIncome)}
                  </p>
                </div>
                <Sparkline values={sparkValues} />
              </div>
            </div>
          </div>
        </section>

        {/* Dues */}
        <section className="flex flex-col justify-between rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600">
                <AlertCircle size={14} />
                Outstanding
              </span>
              <span className="text-xs font-semibold text-stone-400">
                {stats.pendingPayments} pending
              </span>
            </div>

            <p className="mt-5 text-4xl font-extrabold tabular-nums tracking-tight text-stone-900">
              {inr(stats.totalDue)}
            </p>
            <p className="mt-1 text-sm text-stone-500">Total due from farmers</p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-stone-500">Collected</span>
                <span className="text-emerald-600">{collectedPercent}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                  style={{ width: `${collectedPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-stone-400">
                {inr(stats.totalPaid)} of {inr(stats.totalBilled)} billed
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/payments")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-stone-700 active:scale-[0.98]"
          >
            Collect payments
            <ArrowRight size={16} />
          </button>
        </section>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          icon={UsersIcon}
          label="Total Farmers"
          value={stats.totalFarmers}
          tone="emerald"
          onClick={() => navigate("/farmers")}
        />
        <KpiTile
          icon={ClipboardCheck}
          label="Today's Works"
          value={stats.todaysWorks}
          tone="sky"
        />
        <KpiTile
          icon={Receipt}
          label="Total Billed"
          value={inr(stats.totalBilled)}
          tone="violet"
        />
        <KpiTile
          icon={Clock}
          label="Pending Payments"
          value={stats.pendingPayments}
          tone="amber"
          onClick={() => navigate("/payments")}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MonthlyChart data={monthlyIncomeData} inr={inr} />
        </div>
        <div>
          <ExpensePie data={expenseBreakdown} inr={inr} />
        </div>
      </div>

      {/* Recent work + quick actions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentWorkTable records={works} inr={inr} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UI components                                                       */
/* ------------------------------------------------------------------ */

const TONES = {
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-600",
};

function KpiTile({ icon: Icon, label, value, tone = "emerald", onClick }) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group flex items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-stone-900/5 ${
        onClick
          ? "transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/5"
          : ""
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]}`}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xl font-extrabold tabular-nums text-stone-900">
          {value}
        </p>
      </div>

      {onClick && (
        <ArrowRight
          size={16}
          className="ml-auto shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
        />
      )}
    </Wrapper>
  );
}

function Sparkline({ values }) {
  if (!values || values.length < 2) return null;

  const w = 120;
  const h = 44;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x, y];
  });

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="hidden h-11 w-28 sm:block" aria-hidden="true">
      <polyline
        points={line}
        fill="none"
        stroke="#6ee7b7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill="#fff" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-[2rem] bg-emerald-900/10 lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-[2rem] bg-stone-200/70" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-stone-200/70" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-3xl bg-stone-200/70 xl:col-span-2" />
        <div className="h-80 animate-pulse rounded-3xl bg-stone-200/70" />
      </div>
    </div>
  );
}