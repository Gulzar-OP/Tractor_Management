import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarAlt,
  FaChevronDown,
  FaTractor,
  FaRupeeSign,
  FaClock,
  FaWallet,
  FaExclamationCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaFilePdf,
} from "react-icons/fa";
import { exportReportPdf } from "../../utils/exportReportPdf";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

const istToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// "YYYY-MM-DD" me din jodo/ghatao (IST me)
const shiftDate = (key, days) => {
  const d = new Date(`${key}T00:00:00+05:30`);
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const monthStart = (key) => `${key.slice(0, 7)}-01`;

const moneyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const money = (n) => moneyFmt.format(n || 0);

const fmtMinutes = (m) => {
  const total = Math.round(m || 0);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  if (h === 0) return `${mm} min`;
  return `${h} ghanta ${mm} min`;
};

const fmtDayLabel = (key) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const fmtTime = (t) =>
  t
    ? new Date(t).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "-";

const payBadge = {
  paid: { label: "Paid", cls: "bg-green-50 text-green-700 border-green-200" },
  partial: { label: "Aadha", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  due: { label: "Baaki", cls: "bg-red-50 text-red-600 border-red-200" },
  advanced: { label: "Advance", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const workStatusLabel = {
  RUNNING: "Chal raha hai",
  PAUSED: "Ruka hua",
  STOPPED: "Poora",
  IDLE: "Idle",
};

/* ------------------------------ small parts ------------------------------ */

function StatCard({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="truncate text-lg font-semibold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PayBadge({ status }) {
  const b = payBadge[status] || payBadge.due;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${b.cls}`}
    >
      {b.label}
    </span>
  );
}

function DayCard({ day, open, onToggle }) {
  const { totals } = day;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"
      >
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{fmtDayLabel(day.date)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {totals.works} kaam · {fmtMinutes(totals.minutes)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-500">Kamai</p>
            <p className="font-semibold text-slate-800">{money(totals.amount)}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-500">Baaki</p>
            <p
              className={`font-semibold ${
                totals.due > 0 ? "text-red-600" : "text-slate-800"
              }`}
            >
              {money(totals.due)}
            </p>
          </div>
          <div className="text-right sm:hidden">
            <p className="font-semibold text-slate-800">{money(totals.amount)}</p>
          </div>
          <FaChevronDown
            className={`shrink-0 text-slate-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5">
              {/* day totals */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Kamai" value={money(totals.amount)} />
                <MiniStat label="Mila" value={money(totals.paid)} cls="text-green-600" />
                <MiniStat
                  label="Baaki"
                  value={money(totals.due)}
                  cls={totals.due > 0 ? "text-red-600" : ""}
                />
                <MiniStat label="Kharcha" value={money(totals.expense)} cls="text-amber-600" />
              </div>

              {/* works */}
              {day.works.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Kaam</p>
                  <div className="space-y-2">
                    {day.works.map((w) => (
                      <div
                        key={w._id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {w.farmer?.name || "Kisan hata diya gaya"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {w.workType}
                              {w.fieldName ? ` · ${w.fieldName}` : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold text-slate-800">
                              {money(w.totalAmount)}
                            </p>
                            <PayBadge status={w.paymentStatus} />
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <FaClock /> {fmtTime(w.startTime)} - {fmtTime(w.endTime)} (
                            {fmtMinutes(w.totalMinutes)})
                          </span>
                          {w.farmer?.village && (
                            <span className="flex items-center gap-1">
                              <FaMapMarkerAlt /> {w.farmer.village}
                            </span>
                          )}
                          {w.farmer?.phone && (
                            <span className="flex items-center gap-1">
                              <FaPhoneAlt /> {w.farmer.phone}
                            </span>
                          )}
                          {w.status !== "STOPPED" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                              {workStatusLabel[w.status] || w.status}
                            </span>
                          )}
                        </div>

                        {(w.paidAmount > 0 || w.dueAmount !== 0) && (
                          <div className="mt-2 flex gap-4 text-xs">
                            <span className="text-green-600">
                              Mila: {money(w.paidAmount)}
                            </span>
                            <span
                              className={
                                w.dueAmount > 0 ? "text-red-600" : "text-blue-600"
                              }
                            >
                              {w.dueAmount < 0 ? "Advance" : "Baaki"}:{" "}
                              {money(Math.abs(w.dueAmount))}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* expenses */}
              {day.expenses.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Kharcha</p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {day.expenses.map((e) => (
                      <div
                        key={e._id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {e.type}
                          </p>
                          {e.notes ? (
                            <p className="truncate text-xs text-slate-500">{e.notes}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 font-semibold text-amber-600">
                          {money(e.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStat({ label, value, cls = "text-slate-800" }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

/* ------------------------------ main page ------------------------------ */

export default function DateWiseReport() {
  const today = istToday();

  const [from, setFrom] = useState(shiftDate(today, -6));
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDays, setOpenDays] = useState({});
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!data || exporting) return;
    try {
      setExporting(true);
      setError("");
      await exportReportPdf(data);
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("PDF nahi ban paya. Dobara try karo.");
    } finally {
      setExporting(false);
    }
  };

  const presets = useMemo(
    () => [
      { label: "Aaj", from: today, to: today },
      { label: "Kal", from: shiftDate(today, -1), to: shiftDate(today, -1) },
      { label: "7 din", from: shiftDate(today, -6), to: today },
      { label: "30 din", from: shiftDate(today, -29), to: today },
      { label: "Is mahine", from: monthStart(today), to: today },
    ],
    [today]
  );

  useEffect(() => {
    if (!from || !to) return;
    if (to < from) {
      setError("'Tak' date 'Se' date se pehle nahi ho sakti");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`${API}/report/date-wise`, {
          params: { from, to },
          withCredentials: true,
        });
        if (cancelled) return;
        setData(res.data);
        // sabse naya din khula rakho
        const first = res.data.days?.[0]?.date;
        setOpenDays(first ? { [first]: true } : {});
      } catch (err) {
        if (cancelled) return;
        setData(null);
        setError(
          err.response?.data?.message ||
            "Report load nahi ho paya. Internet ya server check karo."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const toggleDay = (key) =>
    setOpenDays((prev) => ({ ...prev, [key]: !prev[key] }));

  const allOpen =
    data?.days?.length > 0 && data.days.every((d) => openDays[d.date]);

  const toggleAll = () => {
    if (!data) return;
    const next = {};
    data.days.forEach((d) => {
      next[d.date] = !allOpen;
    });
    setOpenDays(next);
  };

  const summary = data?.summary;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Date wise report</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kisi bhi din ya dates ke beech ka kaam, kamai aur kharcha dekho
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPdf}
          disabled={loading || exporting || !data}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              PDF ban rahi hai...
            </>
          ) : (
            <>
              <FaFilePdf /> PDF download
            </>
          )}
        </button>
      </div>

      {/* filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = from === p.from && to === p.to;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-700"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="from"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Se
            </label>
            <div className="relative">
              <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
              <input
                id="from"
                type="date"
                value={from}
                max={to || today}
                onChange={(e) => e.target.value && setFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-slate-800 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="to"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tak
            </label>
            <div className="relative">
              <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
              <input
                id="to"
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => e.target.value && setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-slate-800 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            <FaExclamationCircle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      )}

      {/* result */}
      {!loading && summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={FaTractor} label="Total kaam" value={summary.totalWorks} tone="green" />
            <StatCard icon={FaClock} label="Total time" value={fmtMinutes(summary.totalMinutes)} tone="blue" />
            <StatCard icon={FaRupeeSign} label="Total kamai" value={money(summary.totalAmount)} tone="green" />
            <StatCard icon={FaWallet} label="Mila hua" value={money(summary.totalPaid)} tone="green" />
            <StatCard icon={FaExclamationCircle} label="Baaki" value={money(summary.totalDue)} tone="red" />
            <StatCard icon={FaWallet} label="Kharcha" value={money(summary.totalExpense)} tone="amber" />
            <div className="col-span-2 rounded-2xl border border-green-200 bg-gradient-to-br from-green-600 to-emerald-500 p-4 text-white shadow-sm">
              <p className="text-xs font-medium text-white/80">Net (kamai - kharcha)</p>
              <p className="mt-1 text-2xl font-bold">{money(summary.net)}</p>
            </div>
          </div>

          {data.days.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <FaCalendarAlt className="mx-auto text-3xl text-slate-300" />
              <p className="mt-3 font-medium text-slate-700">
                In dates me koi kaam ya kharcha nahi mila
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Dusri date chuno ya naya kaam jodo
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{data.days.length} din ka data</p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  {allOpen ? "Sab band karo" : "Sab kholo"}
                </button>
              </div>
              {data.days.map((day) => (
                <DayCard
                  key={day.date}
                  day={day}
                  open={!!openDays[day.date]}
                  onToggle={() => toggleDay(day.date)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}