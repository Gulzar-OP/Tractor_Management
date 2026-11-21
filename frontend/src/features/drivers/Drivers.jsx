
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  User,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  village: "",
};

export default function Drivers() {
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Driver Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [addingDriver, setAddingDriver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ================= FETCH DRIVERS =================

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/driver/all`, {
        withCredentials: true,
      });

      const driverData = res.data?.drivers || res.data || [];

      setDrivers(Array.isArray(driverData) ? driverData : []);

      console.log("Fetched Drivers:", driverData);
    } catch (error) {
      console.error("Fetch Drivers Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to fetch drivers"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // ================= FORM HANDLERS =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const closeModal = () => {
    if (addingDriver) return;

    setShowAddModal(false);
    setFormData(initialForm);
    setShowPassword(false);
  };

  // ================= ADD DRIVER =================

  const handleAddDriver = async (e) => {
    e.preventDefault();

    const name = formData.name?.trim() || "";
    const email = formData.email?.trim() || "";
    const password = formData.password || "";
    const phone = formData.phone?.trim() || "";
    const village = formData.village?.trim() || "";

    // Validation

    if (!name) {
      return toast.error("Driver name is required");
    }

    if (!email) {
      return toast.error("Email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return toast.error("Enter a valid email address");
    }

    if (!password) {
      return toast.error("Password is required");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return toast.error("Enter a valid 10-digit mobile number");
    }

    try {
      setAddingDriver(true);

      const payload = {
        name,
        email: email.toLowerCase(),
        password,
        phone,
        village,
      };

      const res = await axios.post(`${API}/driver/add`, payload, {
        withCredentials: true,
      });

      toast.success(res.data?.message || "Driver added successfully!");

      setShowAddModal(false);
      setFormData(initialForm);
      setShowPassword(false);

      await fetchDrivers();
    } catch (error) {
      console.error("Add Driver Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to add driver"
      );
    } finally {
      setAddingDriver(false);
    }
  };

  // ================= INITIALS =================

  const initials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // ================= SEARCH =================

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers;

    const q = search.trim().toLowerCase();

    return drivers.filter((d) =>
      [
        d.name,
        d.email,
        d.phone,
        d.vehicleNumber,
        d.village,
      ].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [drivers, search]);

  // ================= STATS =================

  const totalDrivers = drivers.length;

  const totalWorksAcrossDrivers = drivers.reduce(
    (sum, d) => sum + Number(d.totalWorks || d.works?.length || 0),
    0
  );

  const totalCollected = drivers.reduce(
    (sum, d) =>
      sum + Number(d.totalPaidAmount || d.totalCollectedAmount || 0),
    0
  );

  const activeDrivers = drivers.filter(
    (d) => (d.status || "active").toLowerCase() === "active"
  ).length;

  // ================= UI =================

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PageHeader
              title="Drivers"
              subtitle="All drivers working under you, with their work and earnings summary"
            />

            <div className="flex gap-2">
              <button
                onClick={fetchDrivers}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
              >
                <Plus size={18} />
                Add Driver
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY STATS */}

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">

          {/* Total Drivers */}

          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Users size={14} className="text-emerald-600" />
              Total Drivers
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "..." : totalDrivers}
            </p>
          </Card>

          {/* Active Drivers */}

          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <BadgeCheck size={14} className="text-emerald-600" />
              Active
            </div>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {loading ? "..." : activeDrivers}
            </p>
          </Card>

          {/* Total Works */}

          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <ClipboardList size={14} className="text-emerald-600" />
              Total Works
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "..." : totalWorksAcrossDrivers}
            </p>
          </Card>

          {/* Amount Collected */}

          <Card className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <IndianRupee size={14} className="text-emerald-600" />
              Amount Collected
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading
                ? "..."
                : `₹${totalCollected.toLocaleString("en-IN")}`}
            </p>
          </Card>
        </div>

        {/* SEARCH */}

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
              placeholder="Search by name, email, phone, vehicle or village..."
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

        {/* DRIVERS GRID */}

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

                <div className="mt-5 space-y-3">
                  <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDrivers.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {filteredDrivers.map((driver) => {
              const works = Number(
                driver.totalWorks || driver.works?.length || 0
              );

              const collected = Number(
                driver.totalPaidAmount ||
                  driver.totalCollectedAmount ||
                  0
              );

              const due = Number(driver.totalDueAmount || 0);

              const isActive =
                (driver.status || "active").toLowerCase() === "active";

              return (
                <Card
                  key={driver._id}
                  onClick={() => navigate(`/drivers/${driver._id}`)}
                  className="group cursor-pointer rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
                >
                  {/* DRIVER HEADER */}

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

                        {!driver.vehicleNumber && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            Driver
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

                  {/* CONTACT DETAILS */}

                  <div className="mt-4 space-y-2.5 text-sm">

                    {driver.phone && (
                      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                        <Phone size={14} className="text-emerald-600" />
                        <span className="text-slate-700">
                          {driver.phone}
                        </span>
                      </div>
                    )}

                    {driver.email && (
                      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                        <Mail size={14} className="text-emerald-600" />
                        <span className="truncate text-slate-700">
                          {driver.email}
                        </span>
                      </div>
                    )}

                    {driver.village && (
                      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                        <MapPin size={14} className="text-emerald-600" />
                        <span className="text-slate-700">
                          {driver.village}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* STATS */}

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Works
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {works}
                      </p>
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

                  {/* VIEW DETAILS */}

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-400">
                      View driver details
                    </span>

                    <span className="text-xs font-semibold text-emerald-600 transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 text-sm text-slate-500">
              {search
                ? "No drivers match your search."
                : "No drivers added yet."}
            </p>

            {!search && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus size={16} />
                Add Your First Driver
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= ADD DRIVER MODAL ================= */}

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/50 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />

              <div className="relative flex items-center justify-between">
                <div>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur">
                    <Users size={22} />
                  </div>

                  <h2 className="text-xl font-bold text-white">
                    Add New Driver
                  </h2>

                  <p className="mt-1 text-sm text-emerald-50">
                    Create a driver account
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  disabled={addingDriver}
                  className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* FORM */}

            <form onSubmit={handleAddDriver} className="p-6">

              {/* NAME */}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Driver Name <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    name="name"
                    value={formData.name ?? ""}
                    onChange={handleChange}
                    placeholder="Enter driver's full name"
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email ?? ""}
                    onChange={handleChange}
                    placeholder="driver@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password ?? ""}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Driver will use this password to login.
                </p>
              </div>

              {/* PHONE */}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone ?? ""}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* VILLAGE */}

              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Village
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    name="village"
                    value={formData.village ?? ""}
                    onChange={handleChange}
                    placeholder="Enter village name"
                    autoComplete="address-level2"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* BUTTONS */}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={addingDriver}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingDriver}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {addingDriver ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add Driver
                    </>
                  )}
                </button>
              </div>

              {/* REQUIRED FIELDS NOTE */}

              <p className="mt-4 text-center text-xs text-slate-400">
                Fields marked with * are required
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
