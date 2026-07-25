import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/UI/PageHeader";
import StatCard from "../../components/UI/StateCard";
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Users as UsersIcon,
  ClipboardCheck,
  Clock,
  Sprout,
  LogIn,
} from "lucide-react";
import { getAllFarmers } from "../../redux/slice/farmerSlice";

import MonthlyChart from "./MonthlyChart";
import ExpensePie from "./ExpensePie";
import RecentWorkTable from "./RecentWorkTable";
import QuickActions from "./QuickAction";
import { inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
console.log(import.meta.env.VITE_API_BASE_URL);
console.log(import.meta.env);
export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Same auth shape used in Topbar: { role, data: {...} }
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const isLoggedIn = Boolean(user);

  const [works, setWorks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [workRes, expenseRes] = await Promise.all([
        axios.post(`${API}/work/all-works`, {}, { withCredentials: true }),
        axios.get(`${API}/expenses/all-expenses`, { withCredentials: true }),
      ]);

      const workList = workRes.data?.works || workRes.data?.all || workRes.data || [];
      const expenseList = expenseRes.data?.expenses || [];
      // check array
      setWorks(Array.isArray(workList) ? workList : []);
      setExpenses(Array.isArray(expenseList) ? expenseList : []);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError(
        err.response?.status === 401
          ? "Session expired — please log in again."
          : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  // Only touch the backend once we actually know there's a logged-in user —
  // firing these requests while logged out just produces guaranteed 401s.
  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      setLoading(false);
      return;
    }
    dispatch(getAllFarmers());
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn]);

  const today = new Date().toISOString().slice(0, 10);

  const todaysWorks = works.filter((w) => {
    if (!w.date) return false;
    return new Date(w.date).toISOString().slice(0, 10) === today;
  });

  const todaysIncome = todaysWorks.reduce(
    (sum, w) => sum + (w.paidAmount || 0),
    0
  );

  const totalDue = works.reduce((sum, w) => sum + (w.dueAmount || 0), 0);

  const pendingPayments = works.filter((w) => (w.dueAmount || 0) > 0);

  const totalFarmers = new Set(
    works
      .map((w) => w.farmer?._id || w.farmer?.toString?.() || w.farmer)
      .filter(Boolean)
  ).size;

  const monthlyIncomeData = useMemo(() => {
    const map = {};

    works.forEach((work) => {
      if (!work.date) return;
      const date = new Date(work.date);
      if (Number.isNaN(date.getTime())) return;

      const month = date.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!map[month]) {
        map[month] = { month, income: 0 };
      }

      map[month].income += work.totalAmount || 0;
    });

    return Object.values(map);
  }, [works]);

  const currentMonthIncome =
    monthlyIncomeData.length > 0
      ? monthlyIncomeData[monthlyIncomeData.length - 1].income
      : 0;

  const expenseBreakdown = useMemo(() => {
    const map = {};

    expenses.forEach((expense) => {
      if (!map[expense.type]) map[expense.type] = 0;
      map[expense.type] += expense.amount || 0;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // --- Auth still resolving: quiet skeleton, no flash of content ---
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-stone-100" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-stone-100"
            />
          ))}
        </div>
      </div>
    );
  }

  // --- Not logged in: a real screen, not a blank page or a wall of errors ---
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-stone-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-sm">
            <Sprout size={28} className="text-white" />
          </div>

          <h1 className="text-lg font-semibold text-stone-800">
            Log in to see your dashboard
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Income, dues, and today&apos;s work all live here — sign in to
            your account to pick up where you left off.
          </p>

          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.98]"
          >
            <LogIn size={16} />
            Log in
          </button>
        </div>
      </div>
    );
  }

  // --- Logged in, still fetching dashboard data ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-stone-100" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-stone-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="mb-3 font-medium text-red-600">{error}</p>
        <button
          onClick={fetchDashboard}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Welcome back"
        subtitle="Here's what's happening with your tractor business today."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          Icon={IndianRupee}
          label="Today's Income"
          value={inr(todaysIncome)}
          tone="green"
        />
        <StatCard
          Icon={TrendingUp}
          label="Monthly Income"
          value={inr(currentMonthIncome)}
          tone="dark"
        />
        <StatCard
          Icon={AlertCircle}
          label="Total Due"
          value={inr(totalDue)}
          tone="red"
        />
        <StatCard
          Icon={UsersIcon}
          label="Total Farmers"
          value={totalFarmers}
          tone="green"
        />
        <StatCard
          Icon={ClipboardCheck}
          label="Today's Works"
          value={todaysWorks.length}
          tone="dark"
        />
        <StatCard
          Icon={Clock}
          label="Pending Payments"
          value={pendingPayments.length}
          tone="amber"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <MonthlyChart data={monthlyIncomeData} inr={inr} />
        <ExpensePie data={expenseBreakdown} inr={inr} />

        <div className="grid grid-cols-1 gap-6 xl:col-span-2">
          <RecentWorkTable records={works} inr={inr} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}