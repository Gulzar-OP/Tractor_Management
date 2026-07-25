import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Tractor,
  Home,
  Users,
  Clock,
  FileText,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Search as SearchIcon,
} from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const navLinks = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/farmers", icon: Users, label: "Farmers" },
    { to: "/works", icon: FileText, label: "Work Records" },
    { to: "/payments", icon: Clock, label: "Payments" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  // small utility for avatar initials
  const avatarInitial = (name) => (name ? name.trim()[0].toUpperCase() : "U");

  return (
    <>
      <header className="sticky top-0 z-50">
        <nav className="mx-auto max-w-9xl px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur bg-white/60 border border-slate-100 rounded-2xl shadow-sm p-3 flex items-center justify-between gap-4">
            {/* Left: Logo + Primary nav (desktop) */}
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-green-300 rounded-lg"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center shadow-md transform-gpu transition-transform hover:scale-105">
                  <Tractor className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-semibold text-slate-900">Mera Tractor</span>
                  <p className="text-xs text-slate-500 -mt-0.5">Owner dashboard</p>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-1 rounded-xl overflow-hidden">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-green-600 hover:bg-green-50 rounded-xl transition"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Center: Search (compact) */}
            <div className="flex-1 hidden md:flex justify-center">
              <div className="max-w-xl w-full">
                <label className="relative block">
                  <span className="sr-only">Search</span>
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="search"
                    placeholder="Search farmers, work records, payments..."
                    className="w-full bg-white/80 border border-slate-100 rounded-xl py-2 pl-10 pr-3 text-sm placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </label>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen((s) => !s)}
                  className="relative p-2 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <Bell className="w-5 h-5 text-slate-700" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] text-white rounded-full flex items-center justify-center">3</span>
                </button>

                {/* Notification dropdown (small) - add Framer Motion here */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">Notifications</p>
                      <p className="text-xs text-slate-400 mt-1">Recent updates</p>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <button className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-600">✓</div>
                        <div className="text-sm">
                          <div className="font-medium text-slate-800">Payment received</div>
                          <div className="text-xs text-slate-500">Ram Kumar paid ₹2,800</div>
                        </div>
                      </button>
                      <button className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3">
                        <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">!</div>
                        <div className="text-sm">
                          <div className="font-medium text-slate-800">Due reminder</div>
                          <div className="text-xs text-slate-500">Dilip Singh has ₹12,000 due</div>
                        </div>
                      </button>
                      <div className="px-4 py-2">
                        <Link to="/notifications" className="text-xs text-green-600 font-medium">View all</Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              {user ? (
                <div className="relative group">
                  <button
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-green-200"
                    aria-haspopup="true"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                      {avatarInitial(user.name)}
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                      <span className="text-sm font-medium text-slate-900">{user.name}</span>
                      <span className="text-xs text-slate-400">{user.role || "Owner"}</span>
                    </div>
                  </button>

                  {/* Profile dropdown - visible on hover/focus */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 overflow-hidden">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:inline-block px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-green-700"
                >
                  Login
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg ml-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-200"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed top-0 left-0 z-50 w-80 h-full bg-white shadow-2xl border-r border-slate-100 p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center text-white">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">Mera Tractor</div>
                  <div className="text-xs text-slate-400">Owner dashboard</div>
                </div>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <div className="border rounded-lg p-2">
                <label className="relative block">
                  <span className="sr-only">Search</span>
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg focus:outline-none"
                    placeholder="Search..."
                  />
                </label>
              </div>

              <nav className="pt-2 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-green-50 text-slate-700"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                        {avatarInitial(user.name)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full mt-2 flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-3 bg-green-600 text-white rounded-lg font-semibold"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}