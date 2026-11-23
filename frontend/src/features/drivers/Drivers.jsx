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
  ArrowRight,
  AlertCircle,
  SearchX,
  Wallet,
} from "lucide-react";
import { inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  village: "",
};

/* ------------------------------ helpers ------------------------------ */

const AVATAR_THEMES = [
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-pink-500",
  "from-lime-500 to-emerald-600",
  "from-violet-500 to-purple-500",
];

function avatarTheme(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
}

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isDriverActive = (d) => String(d.status || "active").toLowerCase() === "active";
const driverWorks = (d) => Number(d.totalWorks || d.works?.length || 0);
const driverCollected = (d) => Number(d.totalPaidAmount || d.totalCollectedAmount || 0);
const driverDue = (d) => Number(d.totalDueAmount || 0);

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "", cls: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(3, Math.max(1, score > 2 ? 3 : score)); // 1 weak, 2 ok, 3 strong
  return [
    null,
    { score: 1, label: "Weak", cls: "bg-rose-500" },
    { score: 2, label: "Okay", cls: "bg-amber-400" },
    { score: 3, label: "Strong", cls: "bg-emerald-500" },
  ][level];
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const fieldCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60";

/* ------------------------------ page ------------------------------ */

export default function Drivers() {
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [addingDriver, setAddingDriver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ---------------- fetch ---------------- */

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API}/driver/all`, { withCredentials: true });
      const driverData = res.data?.drivers || res.data || [];
      setDrivers(Array.isArray(driverData) ? driverData : []);
    } catch (err) {
      console.error("Fetch Drivers Error:", err);
      const message = err.response?.data?.message || "Failed to fetch drivers";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  /* ---------------- form ---------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;
    // phone: digits only, max 10
    const next = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: next }));
  };

  const closeModal = useCallback(() => {
    if (addingDriver) return;
    setShowAddModal(false);
    setFormData(initialForm);
    setShowPassword(false);
  }, [addingDriver]);

  useEffect(() => {
    if (!showAddModal) return undefined;
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddModal, closeModal]);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (addingDriver) return;

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const phone = formData.phone.trim();
    const village = formData.village.trim();

    if (!name) return toast.error("Driver name is required");
    if (!email) return toast.error("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Enter a valid email address");
    }
    if (!password) return toast.error("Password is required");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return toast.error("Enter a valid 10-digit mobile number");
    }

    try {
      setAddingDriver(true);

      const res = await axios.post(
        `${API}/driver/add`,
        { name, email: email.toLowerCase(), password, phone, village },
        { withCredentials: true }
      );

      toast.success(res.data?.message || "Driver added successfully!");

      setShowAddModal(false);
      setFormData(initialForm);
      setShowPassword(false);

      await fetchDrivers();
    } catch (err) {
      console.error("Add Driver Error:", err);
      toast.error(err.response?.data?.message || "Failed to add driver");
    } finally {
      setAddingDriver(false);
    }
  };

  /* ---------------- derived ---------------- */

  const stats = useMemo(
    () =>
      drivers.reduce(
        (acc, d) => {
          acc.total += 1;
          if (isDriverActive(d)) acc.active += 1;
          acc.works += driverWorks(d);
          acc.collected += driverCollected(d);
          acc.due += driverDue(d);
          return acc;
        },
        { total: 0, active: 0, works: 0, collected: 0, due: 0 }
      ),
    [drivers]
  );

  const statusCounts = {
    all: stats.total,
    active: stats.active,
    inactive: stats.total - stats.active,
  };

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return drivers
      .filter((d) => {
        if (statusFilter === "active" && !isDriverActive(d)) return false;
        if (statusFilter === "inactive" && isDriverActive(d)) return false;
        if (!q) return true;
        return [d.name, d.email, d.phone, d.vehicleNumber, d.village].some((v) =>
          String(v || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [drivers, search, statusFilter]);

  const strength = passwordStrength(formData.password);
  const hasFilters = Boolean(search) || statusFilter !== "all";

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-white/15">
              <Truck size={13} />
              Drivers
            </div>
            <p className="mt-5 text-5xl font-extrabold tabular-nums tracking-tight">
              {loading ? "–" : stats.total}
            </p>
            <p className="mt-1 text-sm text-emerald-100/80">
              driver{stats.total === 1 ? "" : "s"} working under you, with their work and
              earnings summary
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-xl shadow-black/20 transition hover:bg-emerald-50 active:scale-[0.98]"
              >
                <Plus size={18} />
                Add Driver
              </button>
              <button
                type="button"
                onClick={fetchDrivers}
                disabled={loading}
                aria-label="Refresh drivers"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-3">
            <HeroChip icon={BadgeCheck} label="Active" value={loading ? "–" : stats.active} />
            <HeroChip icon={ClipboardList} label="Total works" value={loading ? "–" : stats.works} />
            <HeroChip
              icon={IndianRupee}
              label="Amount collected"
              value={loading ? "–" : inr(stats.collected)}
            />
            <HeroChip
              icon={Wallet}
              label="Total due"
              value={loading ? "–" : inr(stats.due)}
              valueCls="text-rose-200"
            />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <section className="space-y-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-900/5 sm:p-4">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, vehicle or village"
            className={`${fieldCls} pr-10`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    active ? "bg-white/25" : "bg-white text-stone-500"
                  }`}
                >
                  {statusCounts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-stone-200/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={26} />
          </div>
          <p className="mt-4 font-bold text-stone-800">{error}</p>
          <button
            onClick={fetchDrivers}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
            {hasFilters ? <SearchX size={28} /> : <Truck size={28} />}
          </div>
          <h2 className="mt-4 font-bold text-stone-700">
            {hasFilters ? "No drivers match your filters" : "No drivers added yet"}
          </h2>
          <p className="mt-1 text-sm text-stone-400">
            {hasFilters
              ? "Try a different search or status."
              : "Add a driver to start tracking their work."}
          </p>
          {hasFilters ? (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 text-sm font-bold text-emerald-700 hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Your First Driver
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.map((driver) => {
            const active = isDriverActive(driver);
            const due = driverDue(driver);
            const open = () => navigate(`/drivers/${driver._id}`);

            return (
              <article
                key={driver._id}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
                className="group flex cursor-pointer flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-900/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTheme(
                          driver.name
                        )} text-base font-bold text-white shadow-md ring-2 ring-white`}
                      >
                        {initials(driver.name) || <Truck size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-stone-900">
                          {driver.name || "Unnamed Driver"}
                        </p>
                        {driver.vehicleNumber ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                            <Truck size={12} className="text-emerald-600" />
                            {driver.vehicleNumber}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-stone-400">Driver</p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                        active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-stone-100 text-stone-500 ring-stone-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          active ? "bg-emerald-500" : "bg-stone-400"
                        }`}
                      />
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm">
                    {driver.phone && <ContactRow icon={Phone}>{driver.phone}</ContactRow>}
                    {driver.email && <ContactRow icon={Mail}>{driver.email}</ContactRow>}
                    {driver.village && <ContactRow icon={MapPin}>{driver.village}</ContactRow>}
                  </div>
                </div>

                <div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatBox label="Works" value={driverWorks(driver)} />
                    <StatBox
                      label="Collected"
                      value={inr(driverCollected(driver))}
                      cls="text-emerald-600"
                    />
                    <StatBox
                      label="Due"
                      value={inr(due)}
                      cls={due > 0 ? "text-rose-600" : "text-stone-400"}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                    <span className="font-medium text-stone-400">View driver details</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 transition group-hover:translate-x-0.5">
                      Open
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add driver modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            // mousedown (not click): dragging a text selection out of an input
            // must not close the modal and lose the form
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="my-auto w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-6 py-6 text-white">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[28px] border-white/5" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                    <Users size={22} />
                  </div>
                  <h2 className="text-xl font-extrabold">Add New Driver</h2>
                  <p className="mt-0.5 text-sm text-emerald-100/80">Create a driver account</p>
                </div>
                <button
                  onClick={closeModal}
                  disabled={addingDriver}
                  aria-label="Close"
                  className="rounded-xl p-2 text-emerald-100 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-4 p-6">
              <FormField label="Driver name" required icon={User}>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter driver's full name"
                  required
                  autoComplete="name"
                  disabled={addingDriver}
                  className={fieldCls}
                />
              </FormField>

              <FormField label="Email address" required icon={Mail}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="driver@example.com"
                  required
                  autoComplete="email"
                  disabled={addingDriver}
                  className={fieldCls}
                />
              </FormField>

              <div>
                <FormField label="Password" required icon={Lock}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    required
                    autoComplete="new-password"
                    disabled={addingDriver}
                    className={`${fieldCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </FormField>

                {strength ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={`h-1.5 flex-1 rounded-full ${
                            n <= strength.score ? strength.cls : "bg-stone-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-stone-500">{strength.label}</span>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-stone-400">
                    The driver will use this password to log in.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Phone" optional icon={Phone}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit number"
                    maxLength={10}
                    autoComplete="tel"
                    disabled={addingDriver}
                    className={fieldCls}
                  />
                </FormField>

                <FormField label="Village" optional icon={MapPin}>
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    placeholder="Village name"
                    autoComplete="address-level2"
                    disabled={addingDriver}
                    className={fieldCls}
                  />
                </FormField>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={addingDriver}
                  className="flex-1 rounded-2xl bg-stone-100 px-4 py-3.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDriver}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
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

              <p className="text-center text-xs text-stone-400">
                Fields marked with <span className="text-rose-500">*</span> are required
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ parts ------------------------------ */

function HeroChip({ icon: Icon, label, value, valueCls = "" }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70">
        <Icon size={12} />
        {label}
      </p>
      <p className={`mt-1 truncate text-lg font-extrabold tabular-nums ${valueCls}`}>{value}</p>
    </div>
  );
}

function ContactRow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2">
      <Icon size={14} className="shrink-0 text-emerald-600" />
      <span className="truncate text-stone-700">{children}</span>
    </div>
  );
}

function StatBox({ label, value, cls = "text-stone-900" }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-2 py-2.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-extrabold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function FormField({ label, icon: Icon, required, optional, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
        {optional && (
          <span className="ml-1.5 font-medium normal-case tracking-normal text-stone-400">
            (optional)
          </span>
        )}
      </span>
      <div className="relative">
        <Icon
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
        />
        {children}
      </div>
    </label>
  );
}