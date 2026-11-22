
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import {
  Phone,
  MapPin,
  Calendar,
  IndianRupee,
  ClipboardList,
  Clock,
  User,
  ArrowLeft,
  BadgeCheck,
  FileText,
  Search,
  X,
  CreditCard,
  CheckCircle2,
  Truck,
  Wallet,
} from "lucide-react";

import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import PrimaryButton from "../../components/UI/PrimaryButton";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

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

export default function FarmerDetails() {
  const { farmerId } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  // Fetch farmer details
  const fetchDetails = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/farmer/${farmerId}`, {
        withCredentials: true,
      });

      setFarmer(res.data?.farmer || res.data);
    } catch (error) {
      console.error("Farmer fetch error:", error);

      toast.error(
        error.response?.data?.message || "Failed to fetch farmer"
      );

      setFarmer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmerId) {
      fetchDetails();
    }
  }, [farmerId]);

  // Farmer information
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

  // Financial calculations
  const totalWorks = farmer?.works?.length || 0;

  const dueAmount = Number(farmer?.totalDueAmount || 0);
  const paidAmount = Number(farmer?.totalPaidAmount || 0);
  const billedAmount = Number(farmer?.totalBilledAmount || 0);
  const advanceAmount = Number(farmer?.advanceAmount || 0);

  // Account status
  const status =
    dueAmount > 0
      ? paidAmount > 0
        ? "Partial"
        : "Due"
      : advanceAmount > 0
        ? "Advance"
        : "Paid";

  const paidPercent =
    billedAmount > 0
      ? Math.min(
          100,
          Math.round((paidAmount / billedAmount) * 100)
        )
      : 0;

  // Filter handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
    });
  };

  // Filter work records by date
  const filteredWorks = useMemo(() => {
    const works = farmer?.works || [];

    if (!filters.startDate && !filters.endDate) {
      return works;
    }

    const start = filters.startDate
      ? new Date(`${filters.startDate}T00:00:00`).getTime()
      : null;

    const end = filters.endDate
      ? new Date(`${filters.endDate}T23:59:59.999`).getTime()
      : null;

    return works.filter((work) => {
      const workDate = new Date(work.date).getTime();

      if (Number.isNaN(workDate)) return false;

      if (start !== null && workDate < start) return false;
      if (end !== null && workDate > end) return false;

      return true;
    });
  }, [farmer?.works, filters.startDate, filters.endDate]);

  // Navigate to payment page for a particular work
  const handlePayClick = (work) => {
    navigate("/payments", {
      state: {
        workId: work._id,
        farmerID: farmer?._id,
        driverID: work.createdBy,
        farmerName: farmer?.name,
        workType: work.workType || work.type,
        dueAmount: work.dueAmount,
        totalAmount: work.totalAmount,
      },
    });
  };

  // Navigate to payment page for farmer
  const handleRecordPayment = () => {
    navigate("/payments", {
      state: {
        farmerID: farmer?._id,
        farmerName: farmer?.name,
        dueAmount,
      },
    });
  };

  const lastWorkDate =
    farmer?.lastWorkDate || farmer?.works?.[0]?.date;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm" />
            <div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm xl:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md rounded-3xl p-8 text-center">
          <User className="mx-auto h-12 w-12 text-slate-300" />

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Farmer Not Found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Farmer details could not be loaded.
          </p>

          <PrimaryButton
            onClick={() => navigate("/farmers")}
            className="mt-6"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Farmers
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <PageHeader
            title="Farmer Details"
            subtitle="Detailed view of farmer, works, dues and advance payments"
            action={
              <div className="flex flex-wrap items-center gap-3">
                {dueAmount > 0 && (
                  <PrimaryButton
                    onClick={handleRecordPayment}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CreditCard size={16} />
                    Record Payment
                  </PrimaryButton>
                )}

                <PrimaryButton
                  onClick={() => navigate("/farmers")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back to Farmers
                </PrimaryButton>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT COLUMN */}
          <div className="space-y-6 xl:col-span-1">

            {/* Farmer Profile */}
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-xl font-bold text-white shadow-lg shadow-emerald-200">
                  {initials}
                </div>

                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {farmer.name || "Unnamed Farmer"}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {farmer.village || "Village not available"}
                  </p>
                </div>
              </div>

              {/* Account status */}
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <BadgeCheck size={16} />
                  {status} Account
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Current billing and payment status
                </p>
              </div>

              {/* Personal information */}
              <div className="mt-5 space-y-3 text-sm">

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <Phone size={16} className="shrink-0 text-emerald-600" />
                  <span className="text-slate-700">
                    {farmer.phone || "-"}
                  </span>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span className="text-slate-700">
                    {farmer.village || "-"}
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <Calendar size={16} className="shrink-0 text-emerald-600" />
                  <span className="text-slate-700">
                    Last work: {formatDate(lastWorkDate)}
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3">
                  <IndianRupee size={16} className="shrink-0 text-rose-600" />
                  <span className="font-medium text-rose-700">
                    Due: {formatCurrency(dueAmount)}
                  </span>
                </div>

                {/* ADVANCE BALANCE */}
                <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <Wallet size={16} className="shrink-0 text-amber-600" />

                  <div>
                    <p className="text-xs text-amber-700">
                      Advance Balance
                    </p>

                    <p className="font-bold text-amber-800">
                      {formatCurrency(advanceAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <Badge status={status} />
              </div>

              {/* Payment Progress */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">

                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    Payment Progress
                  </p>

                  <span className="text-xs font-semibold text-emerald-300">
                    {paidPercent}%
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>

                <div className="mt-4 space-y-3">

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Total Works
                    </span>
                    <span className="font-semibold">
                      {totalWorks}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Total Billed
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(billedAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Paid
                    </span>
                    <span className="font-semibold text-emerald-300">
                      {formatCurrency(paidAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Due
                    </span>
                    <span className="font-semibold text-rose-300">
                      {formatCurrency(dueAmount)}
                    </span>
                  </div>

                  {/* ADVANCE IN PAYMENT SUMMARY */}
                  <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                    <span className="text-sm text-slate-300">
                      Advance Balance
                    </span>

                    <span className="font-bold text-amber-300">
                      {formatCurrency(advanceAmount)}
                    </span>
                  </div>
                </div>

                {dueAmount > 0 && (
                  <button
                    onClick={handleRecordPayment}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
                  >
                    <CreditCard size={16} />
                    Settle Due Amount
                  </button>
                )}

                {advanceAmount > 0 && dueAmount <= 0 && (
                  <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-center">
                    <p className="text-sm font-semibold text-amber-300">
                      Advance Available
                    </p>

                    <p className="mt-1 text-xs text-slate-300">
                      This farmer has {formatCurrency(advanceAmount)} credit balance.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Driver information */}
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">

              <div className="mb-4 flex items-center gap-2">
                <Truck size={18} className="text-emerald-600" />

                <h3 className="text-lg font-semibold text-slate-900">
                  Assigned Driver
                </h3>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                <Truck className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-2 text-sm font-medium text-slate-600">
                  Driver information unavailable
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  A valid assigned driver ID is required to display driver details.
                </p>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 xl:col-span-2">

            {/* Summary */}
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Financial Summary
                  </h3>

                  <p className="text-sm text-slate-500">
                    Billing, payments, dues and advance balance
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  Live Data
                </div>
              </div>

              {/* Five summary cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

                {/* Total Works */}
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Total Works
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {totalWorks}
                  </p>
                </div>

                {/* Total Billed */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Total Billed
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(billedAmount)}
                  </p>
                </div>

                {/* Paid */}
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Paid
                  </p>

                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {formatCurrency(paidAmount)}
                  </p>
                </div>

                {/* Due */}
                <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Due
                  </p>

                  <p className="mt-2 text-2xl font-bold text-rose-600">
                    {formatCurrency(dueAmount)}
                  </p>
                </div>

                {/* ADVANCE */}
                <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={14} className="text-amber-600" />

                    <p className="text-xs font-medium text-amber-700">
                      Advance Balance
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {formatCurrency(advanceAmount)}
                  </p>

                  <p className="mt-1 text-xs text-amber-600">
                    Available credit
                  </p>
                </div>
              </div>

              {/* Farmer notes */}
              {farmer.notes && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />

                    <p className="text-sm font-semibold text-slate-700">
                      Notes
                    </p>
                  </div>

                  <p className="text-sm text-slate-600">
                    {farmer.notes}
                  </p>
                </div>
              )}
            </Card>

            {/* Work Records */}
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Work Records
                  </h3>

                  <p className="text-sm text-slate-500">
                    Timeline of completed work entries
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  {filteredWorks.length} Records
                </span>
              </div>

              {/* Date filter */}
              <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">

                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Search size={16} className="text-emerald-600" />
                  Search by Date Range
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Start Date
                    </label>

                    <input
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      End Date
                    </label>

                    <input
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      min={filters.startDate || undefined}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="flex items-end">
                    <PrimaryButton
                      type="button"
                      onClick={clearFilters}
                      className="flex w-full items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Clear Filters
                    </PrimaryButton>
                  </div>
                </div>
              </div>

              {/* Work list */}
              <div className="space-y-3">

                {filteredWorks.length ? (
                  filteredWorks.map((work, index) => {
                    const workDue = Number(work.dueAmount || 0);
                    const workPaid = Number(work.paidAmount || 0);
                    const workTotal = Number(work.totalAmount || 0);

                    const workPercent =
                      workTotal > 0
                        ? Math.min(
                            100,
                            Math.round((workPaid / workTotal) * 100)
                          )
                        : 0;

                    const isPaid = workDue <= 0;

                    return (
                      <div
                        key={work._id || index}
                        className="group rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50 p-4 transition-all duration-200 hover:border-emerald-200 hover:shadow-md"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex min-w-0 gap-3">

                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                              <ClipboardList size={18} />
                            </div>

                            <div className="min-w-0">

                              <p className="text-sm font-medium text-slate-500">
                                {work.fieldName || "-"}
                              </p>

                              <p className="text-lg font-semibold text-slate-900">
                                {work.workType || work.type || "Work"}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">

                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} />
                                  {formatDate(work.date)}
                                </span>

                                <span className="inline-flex items-center gap-1">
                                  <Clock size={12} />
                                  {work.totalMinutes || 0} min
                                </span>

                                <span className="inline-flex items-center gap-1">
                                  <User size={12} />
                                  {work.status || "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">

                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(workDue)}
                            </p>

                            <p className="text-xs text-slate-400">
                              Remaining Due
                            </p>

                            <div className="mt-2 flex justify-end">
                              <Badge
                                status={
                                  work.paymentStatus ||
                                  (isPaid ? "Paid" : "Due")
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Work payment progress */}
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
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

                        {/* Work financial information */}
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                            Rate: {formatCurrency(work.ratePerHour)}/hr
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                            Paid: {formatCurrency(workPaid)}
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                            Amount: {formatCurrency(workTotal)}
                          </div>

                          {isPaid ? (
                            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={14} />
                              Paid
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePayClick(work)}
                              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.97]"
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
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                    <FileText className="mx-auto h-10 w-10 text-slate-300" />

                    <p className="mt-3 text-sm font-medium text-slate-600">
                      No work records found.
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Try changing the date filters.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
