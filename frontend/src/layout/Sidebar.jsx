import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  PlusCircle,
  Wallet,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  AlertCircle,
  Tractor,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser, logoutUser } from "../redux/slice/authSlice";

export default function Sidebar({ mobileOpen, setMobileOpen }) {
    const dispatch = useDispatch();

  const { user, loading: authLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

const OWNER_NAV = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
  { label: "Drivers", path: "/drivers", icon: Users, end: true },
  { label: "Farmers", path: "/farmers", icon: Users, end: true },
  { label: "Work Records", path: "/workRecords", icon: ClipboardList, end: true },
  { label: "Add Work", path: "/workRecords/add", icon: PlusCircle },
  { label: "Payments", path: "/payments", icon: Wallet },
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
    { label: "Payments", path: "/payments", icon: Wallet },
  { label: "Due Summary", path: "/farmers/due-summary", icon: AlertCircle, end: true },
];
 const role = user?.data.role; // "owner" or "driver"

  const NAV = role === "owner" ? OWNER_NAV : DRIVER_NAV;
  return (
    <>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-[1px] transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 z-50 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white shadow-sm shadow-green-200">
            <Tractor size={20} />
          </div>

          <div>
            <p className="font-bold text-slate-900 leading-tight">Mera Tractor</p>
            <p className="text-xs text-slate-400">Owner Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item, i) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `sb-link sb-item w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 ${
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
                      className={`sb-icon-wrap flex items-center justify-center w-7 h-7 rounded-lg ${
                        isActive ? "bg-white/15" : ""
                      }`}
                    >
                      <Icon size={17} className={isActive ? "text-white" : "text-slate-400"} />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-green-50 to-slate-50 border border-green-100 text-xs">
          <p className="font-semibold text-slate-700">Tractor Status</p>

          <p className="text-slate-500 mt-1">Mahindra 575 DI Active</p>

          <div className="flex items-center gap-2 mt-2">
            <span className="sb-dot w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-700 font-medium">Running smoothly</span>
          </div>
        </div>
      </aside>
    </>
  );
}