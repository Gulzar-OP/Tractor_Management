import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Truck,
  Phone,
  MapPin,
  Search,
  ClipboardList,
  IndianRupee,
  BadgeCheck,
  X,
  Users,
} from "lucide-react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

export default function Drivers() {
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/driver/all`, { withCredentials: true });
      setDrivers(res.data?.drivers || res.data || []);
      console.log(drivers)
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };
//   const [work,setWork]=useState();
//     const fetchDriversWork = async () => {
//     try {
//       setLoading(true);
//       let driverWork = req.user?.userId
//       const res = await axios.get(`${API}/work/${driverWork}`, { withCredentials: true });
//     //   setWork(res.data?.drivers || res.data || []);
//     //   console.log(drivers)
//     } catch (e) {
//       console.error(e);
//       toast.error(e.response?.data?.message || "Failed to fetch drivers");
//     } finally {
//       setLoading(false);
//     }
//   };

  useEffect(() => {
    fetchDrivers();
    // fetchDriversWork();
  }, []);

  const initials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers;
    const q = search.trim().toLowerCase();
    return drivers.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase?.().includes(q) ||
        d.vehicleNumber?.toLowerCase?.().includes(q) ||
        d.village?.toLowerCase?.().includes(q)
    );
  }, [drivers, search]);

  const totalDrivers = drivers.length;
  const totalWorksAcrossDrivers = drivers.reduce(
    (sum, d) => sum + Number(d.totalWorks || d.works?.length || 0),
    0
  );
  const totalCollected = drivers.reduce(
    (sum, d) => sum + Number(d.totalPaidAmount || d.totalCollectedAmount || 0),
    0
  );
  const activeDrivers = drivers.filter(
    (d) => (d.status || "active").toLowerCase() === "active"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <PageHeader
            title="Drivers"
            subtitle="All drivers working under you, with their work and earnings summary"
          />
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Users size={14} className="text-emerald-600" />
              Total Drivers
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "..." : totalDrivers}
            </p>
          </Card>
          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <BadgeCheck size={14} className="text-emerald-600" />
              Active
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {loading ? "..." : activeDrivers}
            </p>
          </Card>
          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <ClipboardList size={14} className="text-emerald-600" />
              Total Works
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "..." : totalWorksAcrossDrivers}
            </p>
          </Card>
          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <IndianRupee size={14} className="text-emerald-600" />
              Amount Collected
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "..." : `₹${totalCollected.toLocaleString("en-IN")}`}
            </p>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, vehicle number or village..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </Card>

        {/* Drivers grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDrivers.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrivers.map((driver) => {
              const works = Number(driver.totalWorks || driver.works?.length || 0);
              const collected = Number(
                driver.totalPaidAmount || driver.totalCollectedAmount || 0
              );
              const due = Number(driver.totalDueAmount || 0);
              const isActive = (driver.status || "active").toLowerCase() === "active";

              return (
                <Card
                  key={driver._id}
                  onClick={() => navigate(`/drivers/${driver._id}`)}
                  className="group cursor-pointer rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-base font-bold text-white shadow-md">
                        {initials(driver.name) || <Truck size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {driver.name || "Unnamed Driver"}
                        </p>
                        {driver.vehicleNumber && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <Truck size={12} className="text-emerald-600" />
                            {driver.vehicleNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                      <Phone size={14} className="text-emerald-600" />
                      <span className="text-slate-700">{driver.phone || "-"}</span>
                    </div>
                    {driver.village && (
                      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                        <MapPin size={14} className="text-emerald-600" />
                        <span className="text-slate-700">{driver.village}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Works
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{works}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Collected
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-600">
                        ₹{collected.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Due
                      </p>
                      <p className="mt-1 text-sm font-bold text-rose-500">
                        ₹{due.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {search ? "No drivers match your search." : "No drivers added yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}