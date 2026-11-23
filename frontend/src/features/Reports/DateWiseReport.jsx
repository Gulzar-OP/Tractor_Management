import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  FaRedo,
  FaChartLine,
  FaReceipt,
} from "react-icons/fa";
import { exportReportPdf } from "../../utils/exportReportPdf";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

const istToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// Add/subtract days from a "YYYY-MM-DD" key (in IST)
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
const money = (n) => moneyFmt.format(Number(n) || 0);

const fmtMinutes = (m) => {
  const total = Math.round(Number(m) || 0);
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

const dayParts = (key) => {
  const d = new Date(`${key}T00:00:00+05:30`);
  const opts = { timeZone: "Asia/Kolkata" };
  return {
    day: d.toLocaleDateString("en-IN", { ...opts, day: "2-digit" }),
    month: d.toLocaleDateString("en-IN", { ...opts, month: "short" }),
    weekday: d.toLocaleDateString("en-IN", { ...opts, weekday: "short" }),
  };
};

const fmtTime = (t) =>
  t
    ? new Date(t).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "-";

const payBadge = {
  paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500" },
  partial: { label: "Aadha", cls: "bg-amber-50 text-amber-700 ring-amber-200", bar: "bg-amber-400" },
  due: { label: "Baaki", cls: "bg-rose-50 text-rose-600 ring-rose-200", bar: "bg-rose-500" },
  advanced: { label: "Advance", cls: "bg-sky-50 text-sky-700 ring-sky-200", bar: "bg-sky-500" },
};

const workStatusLabel = {
  RUNNING: "Chal raha hai",
  PAUSED: "Ruka hua",
  CANCELLED: "Cancel",
  IDLE: "Idle",
};

// STOPPED and COMPLETED both mean "finished", so no badge is shown for them
const isFinished = (s) => ["STOPPED", "COMPLETED"].includes(String(s || "").toUpperCase());

const inputCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm font-semibold text-stone-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

/* ------------------------------ small parts ------------------------------ */

const TONES = {
  slate: "bg-stone-100 text-stone-600",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-rose-100 text-rose-600",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700",
};

function StatTile({ icon: Icon, label, value, tone = "slate", valueCls = "text-stone-900" }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]}`}
        >
          <Icon />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            {label}
          </p>
          <p className={`truncate text-lg font-extrabold tabular-nums ${valueCls}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PayBadge({ status }) {
  const b = payBadge[status] || payBadge.due;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${b.cls}`}
    >
      {b.label}
    </span>
  );
}

function MiniStat({ label, value, cls = "text-stone-900" }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-3.5 py-3 ring-1 ring-stone-100">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p className={`mt-0.5 font-extrabold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function DayCard({ day, open, onToggle }) {
  const { totals } = day;
  const parts = dayParts(day.date);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5 transition hover:shadow-lg hover:shadow-stone-900/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left sm:p-5"
      >
        {/* date badge */}
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-md shadow-emerald-600/20">
          <span className="text-2xl font-extrabold leading-none">{parts.day}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100">
            {parts.month}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-stone-900">{fmtDayLabel(day.date)}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {totals.works} kaam · {fmtMinutes(totals.minutes)}
          </p>
        </div>

        <div className="hidden gap-6 sm:flex">
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Kamai
            </p>
            <p className="font-extrabold tabular-nums text-stone-900">
              {money(totals.amount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Baaki
            </p>
            <p
              className={`font-extrabold tabular-nums ${
                totals.due > 0 ? "text-rose-600" : "text-stone-900"
              }`}
            >
              {money(totals.due)}
            </p>
          </div>
        </div>

        <p className="font-extrabold tabular-nums text-stone-900 sm:hidden">
          {money(totals.amount)}
        </p>

        <FaChevronDown
          className={`shrink-0 text-stone-300 transition-transform ${
            open ? "rotate-180 text-emerald-600" : ""
          }`}
        />
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
            <div className="space-y-5 border-t border-stone-100 bg-stone-50/50 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Kamai" value={money(totals.amount)} />
                <MiniStat label="Mila" value={money(totals.paid)} cls="text-emerald-600" />
                <MiniStat
                  label="Baaki"
                  value={money(totals.due)}
                  cls={totals.due > 0 ? "text-rose-600" : "text-stone-900"}
                />
                <MiniStat label="Kharcha" value={money(totals.expense)} cls="text-amber-600" />
              </div>

              {/* works */}
              {day.works.length > 0 && (
                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <FaTractor className="text-emerald-600" /> Kaam
                  </p>

                  <div className="space-y-2.5">
                    {day.works.map((w) => {
                      const bar = (payBadge[w.paymentStatus] || payBadge.due).bar;
                      const dueNum = Number(w.dueAmount) || 0;
                      const paidNum = Number(w.paidAmount) || 0;

                      return (
                        <div
                          key={w._id}
                          className="relative overflow-hidden rounded-2xl bg-white p-4 pl-5 shadow-sm ring-1 ring-stone-900/5"
                        >
                          <span className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} />

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-stone-900">
                                {w.farmer?.name || "Kisan hata diya gaya"}
                              </p>
                              <p className="text-sm text-stone-500">
                                {w.workType}
                                {w.fieldName ? ` · ${w.fieldName}` : ""}
                              </p>
                            </div>

                            <div className="shrink-0 space-y-1 text-right">
                              <p className="font-extrabold tabular-nums text-stone-900">
                                {money(w.totalAmount)}
                              </p>
                              <PayBadge status={w.paymentStatus} />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
                            <span className="inline-flex items-center gap-1.5">
                              <FaClock className="text-stone-400" />
                              {fmtTime(w.startTime)} – {fmtTime(w.endTime)} (
                              {fmtMinutes(w.totalMinutes)})
                            </span>
                            {w.farmer?.village && (
                              <span className="inline-flex items-center gap-1.5">
                                <FaMapMarkerAlt className="text-stone-400" />
                                {w.farmer.village}
                              </span>
                            )}
                            {w.farmer?.phone && (
                              <span className="inline-flex items-center gap-1.5">
                                <FaPhoneAlt className="text-stone-400" />
                                {w.farmer.phone}
                              </span>
                            )}
                            {w.status && !isFinished(w.status) && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-700">
                                {workStatusLabel[String(w.status).toUpperCase()] || w.status}
                              </span>
                            )}
                          </div>

                          {(paidNum > 0 || dueNum !== 0) && (
                            <div className="mt-3 flex gap-2 text-xs font-semibold">
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                Mila: {money(paidNum)}
                              </span>
                              <span
                                className={`rounded-lg px-2.5 py-1 ${
                                  dueNum > 0
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-sky-50 text-sky-700"
                                }`}
                              >
                                {dueNum < 0 ? "Advance" : "Baaki"}: {money(Math.abs(dueNum))}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* expenses */}
              {day.expenses.length > 0 && (
                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <FaReceipt className="text-amber-600" /> Kharcha
                  </p>

                  <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-900/5">
                    {day.expenses.map((e) => (
                      <div
                        key={e._id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-stone-800">{e.type}</p>
                          {e.notes ? (
                            <p className="truncate text-xs text-stone-500">{e.notes}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 font-extrabold tabular-nums text-amber-600">
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
  const [reloadKey, setReloadKey] = useState(0);

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
    if (!from || !to) return undefined;

    // Invalid range: clear stale data and stop the spinner so the error is shown cleanly
    if (to < from) {
      setData(null);
      setLoading(false);
      setError("'Tak' date 'Se' date se pehle nahi ho sakti");
      return undefined;
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
        // keep the newest day open
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
  }, [from, to, reloadKey]);

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

  const toggleDay = useCallback(
    (key) => setOpenDays((prev) => ({ ...prev, [key]: !prev[key] })),
    []
  );

  const days = data?.days || [];
  const summary = data?.summary;
  const allOpen = days.length > 0 && days.every((d) => openDays[d.date]);

  const toggleAll = () => {
    const next = {};
    days.forEach((d) => {
      next[d.date] = !allOpen;
    });
    setOpenDays(next);
  };

  const net = Number(summary?.net) || 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {/* header */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[36px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl ring-1 ring-white/20 backdrop-blur">
              <FaChartLine />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Date wise report
              </h1>
              <p className="mt-1 text-sm text-emerald-100/80">
                Kisi bhi din ya dates ke beech ka kaam, kamai aur kharcha dekho
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={loading || exporting || !data}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-xl shadow-black/20 transition hover:bg-emerald-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700" />
                PDF ban rahi hai...
              </>
            ) : (
              <>
                <FaFilePdf /> PDF download
              </>
            )}
          </button>
        </div>
      </header>

      {/* filters */}
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5 sm:p-5">
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
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="from" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
              Se
            </label>
            <div className="relative">
              <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input
                id="from"
                type="date"
                value={from}
                max={to || today}
                onChange={(e) => e.target.value && setFrom(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="to" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-400">
              Tak
            </label>
            <div className="relative">
              <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input
                id="to"
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => e.target.value && setTo(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </section>

      {/* error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            <span className="flex items-start gap-2">
              <FaExclamationCircle className="mt-0.5 shrink-0" />
              {error}
            </span>
            {!data && !loading && to >= from && (
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
              >
                <FaRedo size={11} /> Dobara try karo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-40 animate-pulse rounded-3xl bg-emerald-900/10" />
            <div className="grid grid-cols-2 gap-3 lg:col-span-2 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[4.5rem] animate-pulse rounded-3xl bg-stone-200/70" />
              ))}
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-stone-200/70" />
          ))}
        </div>
      )}

      {/* result */}
      {!loading && summary && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Net */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-500 p-6 text-white shadow-xl shadow-emerald-600/25">
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/80">
                Net (kamai − kharcha)
              </p>
              <p className="mt-3 text-4xl font-extrabold tabular-nums tracking-tight">
                {money(net)}
              </p>
              <p className="mt-2 text-sm text-emerald-50/90">
                {net < 0 ? "Is dauran kharcha zyada raha" : "Is dauran ka munafa"}
              </p>
              <div className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                {days.length} din · {summary.totalWorks} kaam
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2">
              <StatTile icon={FaTractor} label="Total kaam" value={summary.totalWorks} tone="green" />
              <StatTile icon={FaClock} label="Total time" value={fmtMinutes(summary.totalMinutes)} tone="blue" />
              <StatTile icon={FaRupeeSign} label="Total kamai" value={money(summary.totalAmount)} tone="green" />
              <StatTile icon={FaWallet} label="Mila hua" value={money(summary.totalPaid)} tone="green" />
              <StatTile
                icon={FaExclamationCircle}
                label="Baaki"
                value={money(summary.totalDue)}
                tone="red"
                valueCls={summary.totalDue > 0 ? "text-rose-600" : "text-stone-900"}
              />
              <StatTile icon={FaReceipt} label="Kharcha" value={money(summary.totalExpense)} tone="amber" />
            </div>
          </div>

          {days.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-2xl text-stone-300">
                <FaCalendarAlt />
              </div>
              <p className="mt-4 font-bold text-stone-700">
                In dates me koi kaam ya kharcha nahi mila
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Dusri date chuno ya naya kaam jodo
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-stone-500">
                  {days.length} din ka data
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {allOpen ? "Sab band karo" : "Sab kholo"}
                </button>
              </div>

              {days.map((day) => (
                <DayCard
                  key={day.date}
                  day={day}
                  open={Boolean(openDays[day.date])}
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