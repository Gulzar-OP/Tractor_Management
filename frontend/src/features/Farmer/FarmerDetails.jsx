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
} from "lucide-react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import PrimaryButton from "../../components/UI/PrimaryButton";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

export default function FarmerDetails() {
  const { farmerId } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/farmer/${farmerId}`);
      setFarmer(res.data?.farmer || res.data);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to fetch farmer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [farmerId]);

  // Fetch driver once the farmer (and therefore createdBy) is available
  const fetchDriver = async () => {
    if (!farmer?.createdBy) return;
    try {
      setDriverLoading(true);
      const res = await axios.get(`${API}/driver/${farmer.createdBy}`, {
        withCredentials: true,
      });
      setDriver(res.data.driver);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to fetch driver");
    } finally {
      setDriverLoading(false);
    }
  };

  useEffect(() => {
    fetchDriver();
  }, [farmer?.createdBy]);

  const dateFormat = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const initials = useMemo(() => {
    const name = farmer?.name || "";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [farmer]);

  const driverInitials = useMemo(() => {
    const name = driver?.name || "";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [driver]);

  const totalWorks = farmer?.works?.length || 0;
  const dueAmount = Number(farmer?.totalDueAmount || 0);
  const paidAmount = Number(farmer?.totalPaidAmount || 0);
  const billedAmount = Number(farmer?.totalBilledAmount || 0);
  const paidPercent =
    billedAmount > 0 ? Math.min(100, Math.round((paidAmount / billedAmount) * 100)) : 0;

  const status = dueAmount > 0 ? (paidAmount > 0 ? "Partial" : "Due") : "Paid";

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

  const filteredWorks = useMemo(() => {
    const works = farmer?.works || [];
    if (!filters.startDate && !filters.endDate) return works;

    const start = filters.startDate ? new Date(filters.startDate).getTime() : null;
    const end = filters.endDate ? new Date(filters.endDate).setHours(23, 59, 59, 999) : null;

    return works.filter((w) => {
      const workDate = new Date(w.date).getTime();
      if (start && workDate < start) return false;
      if (end && workDate > end) return false;
      return true;
    });
  }, [farmer?.works, filters.startDate, filters.endDate]);

  // Navigate to the payment page with full context so nothing has to be re-fetched/re-typed there
  const handlePayClick = (work) => {
    navigate("/payments", {
      state: {
        workId: work._id,
        farmerID: farmer?._id,
        driverID: work.createdBy || farmer?.createdBy,
        farmerName: farmer?.name,
        workType: work.workType || work.type,
        dueAmount: work.dueAmount,
        totalAmount: work.totalAmount,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <PageHeader
            title="Farmer Details"
            subtitle="Detailed view of farmer, works, dues and payments"
            action={
              <div className="flex items-center gap-3">
                {dueAmount > 0 && (
                  <PrimaryButton
                    onClick={() =>
                      navigate("/payments", {
                        state: {
                          farmerID: farmer?._id,
                          farmerName: farmer?.name,
                          dueAmount,
                        },
                      })
                    }
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
          <div className="space-y-6 xl:col-span-1">
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-xl font-bold text-white shadow-lg shadow-emerald-200">
                  {loading ? "..." : initials}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {loading ? "Loading..." : farmer?.name}
                  </h2>
                  <p className="text-sm text-slate-500">{loading ? "" : farmer?.village}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <BadgeCheck size={16} />
                  {status} account
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Live farmer profile and billing summary
                </p>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <Phone size={16} className="text-emerald-600" />
                  <span className="text-slate-700">{farmer?.phone || "-"}</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <MapPin size={16} className="mt-0.5 text-emerald-600" />
                  <span className="text-slate-700">{farmer?.village || "-"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <Calendar size={16} className="text-emerald-600" />
                  <span className="text-slate-700">
                    Last work: {farmer?.works?.length ? dateFormat(farmer.works[0].date) : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <IndianRupee size={16} className="text-emerald-600" />
                  <span className="text-slate-700">
                    Due: {loading ? "Loading..." : `₹${dueAmount.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <Badge status={status} />
              </div>

              {/* Payment progress */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    Payment progress
                  </p>
                  <span className="text-xs font-semibold text-emerald-300">{paidPercent}%</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Total works</span>
                    <span className="font-semibold">{totalWorks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Total billed</span>
                    <span className="font-semibold">₹{billedAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Paid</span>
                    <span className="font-semibold text-emerald-300">
                      ₹{paidAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Due</span>
                    <span className="font-semibold text-rose-300">
                      ₹{dueAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {dueAmount > 0 && (
                  <button
                    onClick={() =>
                      navigate("/payments", {
                        state: { farmerID: farmer?._id, farmerName: farmer?.name, dueAmount },
                      })
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
                  >
                    <CreditCard size={16} />
                    Settle Due Amount
                  </button>
                )}
              </div>
            </Card>

            {/* Dedicated Driver card */}
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <Truck size={18} className="text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Assigned Driver</h3>
              </div>

              {driverLoading ? (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ) : driver ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-bold text-white shadow-md">
                    {driverInitials || <Truck size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {driver.name}
                    </p>
                    {driver.phone && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone size={12} className="text-emerald-600" />
                        {driver.phone}
                      </p>
                    )}
                    {driver.vehicleNumber && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Truck size={12} className="text-emerald-600" />
                        {driver.vehicleNumber}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                  <Truck className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-500">No driver assigned yet.</p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6 xl:col-span-2">
            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                  <p className="text-sm text-slate-500">Billing and work statistics</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  Live data
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">Total Works</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{totalWorks}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">Total Amount</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    ₹{billedAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">Paid</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    ₹{paidAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-400">Due</p>
                  <p className="mt-2 text-2xl font-bold text-rose-600">
                    ₹{dueAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {farmer?.notes && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {farmer.notes}
                </div>
              )}
            </Card>

            <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Work Records</h3>
                  <p className="text-sm text-slate-500">Timeline of completed work entries</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  {filteredWorks.length} records
                </span>
              </div>

              <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Search size={16} className="text-emerald-600" />
                  Search by date range
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <PrimaryButton
                      type="button"
                      onClick={clearFilters}
                      className="flex w-full items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Clear
                    </PrimaryButton>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredWorks.length ? (
                  filteredWorks.map((w, index) => {
                    const workDue = Number(w.dueAmount || 0);
                    const workPaid = Number(w.paidAmount || 0);
                    const workTotal = Number(w.totalAmount || 0);
                    const workPercent =
                      workTotal > 0 ? Math.min(100, Math.round((workPaid / workTotal) * 100)) : 0;
                    const isPaid = workDue <= 0;

                    return (
                      <div
                        key={w._id || index}
                        className="group rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50 p-4 transition-all duration-200 hover:border-emerald-200 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                              <ClipboardList size={18} />
                            </div>

                            <div>
                              <p className="text-sm font-medium text-slate-500">
                                {w.fieldName || "-"}
                              </p>
                              <p className="text-lg font-semibold text-slate-900">
                                {w.workType || w.type || "Work"}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} />
                                  {dateFormat(w.date)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={12} />
                                  {w.totalMinutes || 0} min
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <User size={12} />
                                  {w.status || "-"}
                                </span>
                                {driver?.name && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                    <Truck size={12} />
                                    {driver.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              ₹{workDue.toLocaleString("en-IN")}
                            </p>
                            <div className="mt-2 flex justify-end">
                              <Badge status={w.paymentStatus || w.status || "Due"} />
                            </div>
                          </div>
                        </div>

                        {/* Per-work payment progress bar */}
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPaid ? "bg-emerald-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${workPercent}%` }}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                            Rate: ₹{Number(w.ratePerHour || 0).toLocaleString("en-IN")}/hr
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                            Paid: ₹{workPaid.toLocaleString("en-IN")}
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                            Amount: ₹{workTotal.toLocaleString("en-IN")}
                          </div>

                          {isPaid ? (
                            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={14} />
                              Paid
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePayClick(w)}
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
                    <p className="mt-3 text-sm text-slate-500">No work records found.</p>
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