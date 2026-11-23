import axios from "axios";
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardList,
  PlusCircle,
  Wallet,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  AlertCircle,
  Tractor,
  LogOut,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser, logoutUser } from "../redux/slice/authSlice";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const APP_NAME = "Smart Tractor";
const POLL_MS = 30000; // tractor status har 30 second me refresh

/* Component ke bahar rakha hai, taaki har render pe naye arrays na bane */
const OWNER_NAV = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
  { label: "Drivers", path: "/drivers", icon: UserCog, end: true },
  { label: "Farmers", path: "/farmers", icon: Users, end: true },
  { label: "Work Records", path: "/workRecords", icon: ClipboardList, end: true },
  { label: "Add Work", path: "/workRecords/add", icon: PlusCircle },
  { label: "Works Start", path: "/workRecords/work", icon: PlusCircle},
  { label: "Payments", path: "/payments", icon: Wallet },
  { label: "Payment Records", path: "/payment-records", icon: Wallet },
  { label: "Due Summary", path: "/farmers/due-summary", icon: AlertCircle, end: true },
  { label: "Expenses", path: "/expenses", icon: Receipt },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];

const DRIVER_NAV = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
  { label: "Farmers", path: "/farmers", icon: Users, end: true },
  { label: "Work Records", path: "/workRecords", icon: ClipboardList, end: true },
  { label: "Add Work", path: "/workRecords/add", icon: PlusCircle },
  { label: "Works Start", path: "/workRecords/work", icon: PlusCircle},
  { label: "Payments", path: "/payments", icon: Wallet },
  { label: "Due Summary", path: "/farmers/due-summary", icon: AlertCircle, end: true },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];

const STATUS_UI = {
  RUNNING: {
    label: "Kaam chal raha hai",
    dot: "bg-green-500 animate-pulse",
    text: "text-green-700",
    card: "from-green-50 to-slate-50 border-green-100",
  },
  PAUSED: {
    label: "Kaam ruka hua hai",
    dot: "bg-amber-500",
    text: "text-amber-700",
    card: "from-amber-50 to-slate-50 border-amber-100",
  },
  IDLE: {
    label: "Abhi khali hai",
    dot: "bg-slate-400",
    text: "text-slate-600",
    card: "from-slate-50 to-white border-slate-200",
  },
};

const fmtMinutes = (m) => {
  const total = Math.round(m || 0);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return h === 0 ? `${mm} min` : `${h}h ${mm}m`;
};

const fmtLastWork = (t) =>
  new Date(t).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

// Card me hi dikhata hai ki status kyun load nahi hua (DevTools kholne ki zaroorat nahi)
const explainError = (e) => {
  if (!e) return "";
  if (e.message?.startsWith("Unexpected response")) {
    return `Galat jawab aaya. API URL shayad galat server ko ja raha hai: ${API}`;
  }
  if (e.status === 404) {
    return "404: /api/tractor/status route nahi mila. app.js me tractor route jodo aur backend restart karo.";
  }
  if (e.status === 401) return "401: login nahi hai. Dobara login karo.";
  if (e.status >= 500) return `Server error (${e.status}). Backend terminal ka error dekho.`;
  if (!e.status) return `Server tak pahunch nahi paya. API URL check karo: ${API}`;
  return `Error ${e.status}: ${e.message}`;
};

/* Tractor ka status server se laata hai aur har 30 second me refresh karta hai */
function useTractorStatus(enabled) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let controller;

    const load = async () => {
      if (document.hidden) return; // tab background me ho to request mat bhejo
      controller?.abort();
      controller = new AbortController();

      try {
        const res = await axios.get(`${API}/tractor/status`, {
          withCredentials: true,
          signal: controller.signal,
        });
        // Galat jagah (jaise HTML page) se 200 aaye to use data mat maano
        if (!res.data?.success || !res.data?.tractor) {
          throw new Error("Unexpected response from /tractor/status");
        }
        if (!cancelled) setState({ data: res.data, loading: false, error: null });
      } catch (err) {
        if (cancelled || axios.isCancel(err)) return;
        const info = {
          status: err.response?.status || null,
          message: err.response?.data?.message || err.message,
        };
        console.error("tractor status failed:", info);
        // purana data dikhta rahe, saath me error ki wajah
        setState((prev) => ({ ...prev, loading: false, error: info }));
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Tractor ki detail save hote hi turant refresh (TractorDetailsForm se aata hai)
    window.addEventListener("tractor-updated", load);

    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("tractor-updated", load);
    };
  }, [enabled]);

  return state;
}

function TractorCard({ role, onNavigate }) {
  const { data, loading, error } = useTractorStatus(true);

  if (loading && !data) {
    return (
      <div className="m-3 h-28 animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />
    );
  }

  if (!data) {
    return (
      <div className="m-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-600">Tractor ka status load nahi ho paya.</p>
        <p className="mt-1 break-words">{explainError(error)}</p>
      </div>
    );
  }

  const ui = STATUS_UI[data.status] || STATUS_UI.IDLE;
  const tractor = data.tractor || {};
  const { current, lastWorkAt } = data;
  const extraRunning = Math.max(0, (data.runningCount || 0) - 1);

  return (
    <div className={`m-3 rounded-2xl border bg-gradient-to-br p-4 text-xs ${ui.card}`}>
      <p className="font-semibold text-slate-700">Tractor Status</p>

      {tractor.model ? (
        <p className="mt-1 text-slate-600">
          {tractor.model}
          {tractor.number ? (
            <span className="ml-1 text-slate-400">({tractor.number})</span>
          ) : null}
        </p>
      ) : role === "owner" ? (
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="mt-1 block text-green-700 underline underline-offset-2"
        >
          Tractor ka model set karo
        </NavLink>
      ) : (
        <p className="mt-1 text-slate-400">Model set nahi hai</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className={`sb-dot h-2 w-2 rounded-full ${ui.dot}`} />
        <span className={`font-medium ${ui.text}`}>{ui.label}</span>
      </div>

      {current && (
        <p className="mt-1.5 text-slate-500">
          {[current.farmerName, current.workType].filter(Boolean).join(" · ")}
          {" · "}
          {fmtMinutes(current.workedMinutes)}
        </p>
      )}

      {extraRunning > 0 && (
        <p className="mt-1 text-slate-400">+{extraRunning} aur kaam chal rahe hain</p>
      )}

      {data.status === "IDLE" && lastWorkAt && (
        <p className="mt-1.5 text-slate-400">Aakhri kaam: {fmtLastWork(lastWorkAt)}</p>
      )}

      {error && <p className="mt-1.5 text-amber-600">Refresh nahi ho paya</p>}
    </div>
  );
}

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
console.log("Sidebar user:", user?.role);
  // Sirf tab fetch karo jab user abhi store me nahi hai (Login pe already ho chuka hota hai).
  // Dependency me user nahi hai, warna fail hone par baar-baar request jaati.
  useEffect(() => {
    if (!user) dispatch(getCurrentUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Esc dabane par mobile sidebar band
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  const role = user?.role; // "owner" | "driver"
  // console.log(user.role)
  // Role na mile to bhi menu dikhe (pehle ki tarah driver menu), khali na rahe
  const NAV = role === "owner" ? OWNER_NAV : DRIVER_NAV;
  const close = () => setMobileOpen(false);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser());
    } finally {
      close();
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-100 bg-white transition-transform duration-300 lg:sticky ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-700 text-white shadow-sm shadow-green-200">
            <Tractor size={20} />
          </div>
          <div>
            <p className="font-bold leading-tight text-slate-900">{APP_NAME}</p>
            <p className="text-xs text-slate-400">
              {role === "driver" ? "Driver Dashboard" : "Owner Dashboard"}
            </p>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main menu">
          {!user
            ? [0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-2xl bg-slate-100" />
              ))
            : NAV.map((item, i) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={close}
                    className={({ isActive }) =>
                      `sb-link sb-item flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? "bg-green-600 text-white shadow-sm shadow-green-200"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`sb-icon-wrap flex h-7 w-7 items-center justify-center rounded-lg ${
                            isActive ? "bg-white/15" : ""
                          }`}
                        >
                          <Icon
                            size={17}
                            className={isActive ? "text-white" : "text-slate-400"}
                          />
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
        </nav>

        {/* dynamic tractor details */}
        {user && <TractorCard role={role} onNavigate={close} />}

        {/* user + logout */}
        {user && (
          <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
              {(user.name || "?").trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs capitalize text-slate-400">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}