import axios from "axios";
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardList,
  PlusCircle,
  Play,
  Wallet,
  ReceiptText,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  AlertCircle,
  Tractor,
  LogOut,
  LogIn,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser, logoutUser } from "../redux/slice/authSlice";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const APP_NAME = "Smart Tractor";
const POLL_MS = 30000; // refresh tractor status every 30 seconds

/* Kept outside the component so new arrays aren't built on every render */
const OWNER_NAV = [
  { group: "Overview", label: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
  { group: "People", label: "Drivers", path: "/drivers", icon: UserCog, end: true },
  { group: "People", label: "Farmers", path: "/farmers", icon: Users, end: true },
  { group: "Work", label: "Work Records", path: "/workRecords", icon: ClipboardList, end: true },
  { group: "Work", label: "Add Work", path: "/workRecords/add", icon: PlusCircle },
  { group: "Work", label: "Works Start", path: "/workRecords/work", icon: Play },
  { group: "Money", label: "Payments", path: "/payments", icon: Wallet },
  { group: "Money", label: "Payment Records", path: "/payment-records", icon: ReceiptText },
  { group: "Money", label: "Due Summary", path: "/farmers/due-summary", icon: AlertCircle, end: true },
  { group: "Money", label: "Expenses", path: "/expenses", icon: Receipt },
  { group: "More", label: "Reports", path: "/reports", icon: BarChart3 },
  { group: "More", label: "Settings", path: "/settings", icon: SettingsIcon },
];

const DRIVER_NAV = [
  { group: "Overview", label: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
  { group: "People", label: "Farmers", path: "/farmers", icon: Users, end: true },
  { group: "Work", label: "Work Records", path: "/workRecords", icon: ClipboardList, end: true },
  { group: "Work", label: "Add Work", path: "/workRecords/add", icon: PlusCircle },
  { group: "Work", label: "Works Start", path: "/workRecords/work", icon: Play },
  { group: "Money", label: "Payments", path: "/payments", icon: Wallet },
  { group: "Money", label: "Due Summary", path: "/farmers/due-summary", icon: AlertCircle, end: true },
  { group: "More", label: "Reports", path: "/reports", icon: BarChart3 },
  { group: "More", label: "Settings", path: "/settings", icon: SettingsIcon },
];

const STATUS_UI = {
  RUNNING: {
    label: "Kaam chal raha hai",
    dot: "bg-emerald-400 animate-pulse",
    text: "text-emerald-300",
    card: "bg-emerald-400/10 ring-emerald-400/20",
  },
  PAUSED: {
    label: "Kaam ruka hua hai",
    dot: "bg-amber-400",
    text: "text-amber-300",
    card: "bg-amber-400/10 ring-amber-400/20",
  },
  IDLE: {
    label: "Abhi khali hai",
    dot: "bg-stone-400",
    text: "text-stone-300",
    card: "bg-white/5 ring-white/10",
  },
};

const fmtMinutes = (m) => {
  const total = Math.round(m || 0);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return h === 0 ? `${mm} min` : `${h}h ${mm}m`;
};

const fmtLastWork = (t) => {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
};

// Technical reason for a failed status load. It goes to the console and a tooltip only,
// so people using the app see a short friendly message instead of developer hints.
const explainError = (e) => {
  if (!e) return "";
  if (e.message?.startsWith("Unexpected response")) {
    return `Unexpected response. The API URL may be pointing at the wrong server: ${API}`;
  }
  if (e.status === 404) {
    return "404: /api/tractor/status route not found. Register the tractor route in app.js and restart the backend.";
  }
  if (e.status === 401) return "401: not logged in. Please log in again.";
  if (e.status >= 500) return `Server error (${e.status}). Check the backend terminal.`;
  if (!e.status) return `Could not reach the server. Check the API URL: ${API}`;
  return `Error ${e.status}: ${e.message}`;
};

/* Fetches tractor status from the server and refreshes it every 30 seconds */
function useTractorStatus(enabled) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let controller;

    const load = async () => {
      if (document.hidden) return; // don't poll while the tab is in the background
      controller?.abort();
      controller = new AbortController();

      try {
        const res = await axios.get(`${API}/tractor/status`, {
          withCredentials: true,
          signal: controller.signal,
        });
        // A 200 from the wrong place (e.g. an HTML page) is not real data
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
        // keep showing the old data, plus the reason
        setState((prev) => ({ ...prev, loading: false, error: info }));
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Refresh immediately when tractor details are saved (fired by TractorDetailsForm)
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
    return <div className="mx-3 mb-3 h-28 animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />;
  }

  if (!data) {
    return (
      <div
        className="mx-3 mb-3 rounded-2xl bg-white/5 p-4 text-xs text-emerald-100/70 ring-1 ring-white/10"
        title={explainError(error)}
      >
        <p className="font-bold text-emerald-50">Tractor status</p>
        <p className="mt-1">Abhi load nahi ho paya. Thodi der baad dobara try hoga.</p>
      </div>
    );
  }

  const ui = STATUS_UI[data.status] || STATUS_UI.IDLE;
  const tractor = data.tractor || {};
  const { current, lastWorkAt } = data;
  const extraRunning = Math.max(0, (data.runningCount || 0) - 1);

  return (
    <div className={`mx-3 mb-3 rounded-2xl p-4 text-xs ring-1 ${ui.card}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
        Tractor Status
      </p>

      {tractor.model ? (
        <p className="mt-1.5 font-bold text-white">
          {tractor.model}
          {tractor.number ? (
            <span className="ml-1 font-medium text-emerald-100/50">({tractor.number})</span>
          ) : null}
        </p>
      ) : role === "owner" ? (
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="mt-1.5 block font-semibold text-emerald-300 underline underline-offset-2"
        >
          Tractor ka model set karo
        </NavLink>
      ) : (
        <p className="mt-1.5 text-emerald-100/50">Model set nahi hai</p>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <span className={`sb-dot h-2 w-2 rounded-full ${ui.dot}`} />
        <span className={`font-bold ${ui.text}`}>{ui.label}</span>
      </div>

      {current && (
        <p className="mt-1.5 text-emerald-100/70">
          {[current.farmerName, current.workType].filter(Boolean).join(" · ")}
          {" · "}
          {fmtMinutes(current.workedMinutes)}
        </p>
      )}

      {extraRunning > 0 && (
        <p className="mt-1 text-emerald-100/50">+{extraRunning} aur kaam chal rahe hain</p>
      )}

      {data.status === "IDLE" && lastWorkAt && (
        <p className="mt-1.5 text-emerald-100/50">Aakhri kaam: {fmtLastWork(lastWorkAt)}</p>
      )}

      {error && (
        <p className="mt-1.5 text-amber-300" title={explainError(error)}>
          Refresh nahi ho paya
        </p>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSelector((state) => state.auth);

  // Only fetch when there is no user in the store yet (login already fills it).
  // `user` is not a dependency, otherwise a failed fetch would retry forever.
  useEffect(() => {
    if (!user) dispatch(getCurrentUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Escape closes the mobile sidebar
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  // Don't let the page scroll behind the open mobile drawer
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const role = user?.role; // "owner" | "driver"
  // If the role is missing the driver menu is shown, so the menu is never empty
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
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-gradient-to-b from-emerald-950 via-emerald-950 to-emerald-900 text-white transition-transform duration-300 lg:sticky ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-900/40">
            <Tractor size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight tracking-tight">{APP_NAME}</p>
            <p className="text-[11px] font-medium text-emerald-100/60">
              {role === "driver" ? "Driver Dashboard" : "Owner Dashboard"}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="rounded-xl p-2 text-emerald-100/70 transition hover:bg-white/10 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2" aria-label="Main menu">
          {!user ? (
            authLoading || authLoading === undefined ? (
              <div className="space-y-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <NavLink
                to="/login"
                onClick={close}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <LogIn size={17} />
                Log in
              </NavLink>
            )
          ) : (
            NAV.map((item, i) => {
              const Icon = item.icon;
              const showGroup = i === 0 || NAV[i - 1].group !== item.group;

              return (
                <React.Fragment key={item.path}>
                  {showGroup && (
                    <p className="mb-1.5 mt-4 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/40 first:mt-0">
                      {item.group}
                    </p>
                  )}

                  <NavLink
                    to={item.path}
                    end={item.end}
                    onClick={close}
                    className={({ isActive }) =>
                      `sb-link sb-item relative flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                        isActive
                          ? "bg-emerald-500/20 text-white"
                          : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
                      }`
                    }
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-400" />
                        )}
                        <span
                          className={`sb-icon-wrap flex h-8 w-8 items-center justify-center rounded-xl ${
                            isActive ? "bg-emerald-500 text-white shadow-md" : "bg-white/5"
                          }`}
                        >
                          <Icon size={16} className={isActive ? "text-white" : "text-emerald-100/60"} />
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </React.Fragment>
              );
            })
          )}
        </nav>

        {/* dynamic tractor details */}
        {user && <TractorCard role={role} onNavigate={close} />}

        {/* user + logout */}
        {user && (
          <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-extrabold text-white">
              {(user.name || "?").trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user.name}</p>
              <p className="text-[11px] capitalize text-emerald-100/50">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
              className="rounded-xl p-2 text-emerald-100/60 transition hover:bg-rose-500/20 hover:text-rose-300"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}