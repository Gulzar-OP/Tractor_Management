import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
  Coins,
  Wallet,
  TrendingUp,
  Layers,
  AlertTriangle,
  RotateCcw,
  Settings as SettingsIcon,
  Tractor,
} from "lucide-react";
import axios from "axios";
import TractorDetailsForm from "../../components/TractorDetailsForm";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

// Show the server's message when there is one, otherwise a default
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

const rowKey = (r) => r._id || r.type;

const isInvalidRate = (value) => {
  const n = Number(value);
  return value === "" || !Number.isFinite(n) || n < 0;
};

const inputBase =
  "w-full rounded-2xl border bg-white py-3 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:ring-4";
const inputOk =
  "border-stone-200 focus:border-emerald-500 focus:ring-emerald-100";
const inputBad = "border-rose-300 focus:border-rose-500 focus:ring-rose-100";

export default function Settings() {
  const [rates, setRates] = useState([]);
  const [original, setOriginal] = useState([]); // last saved snapshot
  const [loading, setLoading] = useState(true);
  const [savingRates, setSavingRates] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState("");
  const [newRate, setNewRate] = useState("");

  const savedTimer = useRef(null);

  useEffect(() => {
    fetchRates();
    return () => clearTimeout(savedTimer.current); // clear timer on unmount
  }, []);

  async function fetchRates() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/rate/rates`, { withCredentials: true });
      const list = res.data.rates || res.data.data || [];
      setRates(list);
      setOriginal(list);
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not load rates. Please refresh."));
    } finally {
      setLoading(false);
    }
  }

  function flashSaved(msg) {
    setSaved(msg);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(""), 2500);
  }

  // Keep the typed text as-is so the field can be cleared and retyped
  function updateRate(i, val) {
    setRates((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], rate: val };
      return next;
    });
  }

  /* ---------------- Derived ---------------- */

  const dirty = useMemo(() => {
    if (rates.length !== original.length) return true;
    return rates.some((r, i) => {
      const o = original[i];
      return !o || r.type !== o.type || String(r.rate) !== String(o.rate);
    });
  }, [rates, original]);

  const totalRates = rates.length;

  const { avgRate, maxRate } = useMemo(() => {
    const nums = rates.map((r) => Number(r.rate) || 0);
    if (!nums.length) return { avgRate: 0, maxRate: 0 };
    return {
      avgRate: Math.round(nums.reduce((s, n) => s + n, 0) / nums.length),
      maxRate: Math.max(...nums),
    };
  }, [rates]);

  /* ---------------- Actions ---------------- */

  async function saveRates() {
    const bad = rates.find((r) => isInvalidRate(r.rate));
    if (bad) {
      setError(`Enter a valid rate for "${bad.type}" (0 or more)`);
      return;
    }

    setSavingRates(true);
    setError("");
    try {
      // unit is always "hour": billing is per hour
      const payload = rates.map((r) => ({
        type: r.type,
        rate: Number(r.rate),
        unit: "hour",
      }));
      const res = await axios.put(
        `${API}/rate/rates`,
        { rates: payload },
        { withCredentials: true }
      );

      const next = res.data.rates || rates.map((r) => ({ ...r, rate: Number(r.rate) }));
      setRates(next);
      setOriginal(next);
      flashSaved("Rates saved successfully");
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not save rates. Try again."));
    } finally {
      setSavingRates(false);
    }
  }

  function discardChanges() {
    setRates(original);
    setError("");
  }

  async function addNewRate() {
    const type = newType.trim();
    if (!type) {
      setError("Please enter a work type name");
      return;
    }
    if (rates.some((r) => r.type.trim().toLowerCase() === type.toLowerCase())) {
      setError(`"${type}" already exists`);
      return;
    }
    if (isInvalidRate(newRate)) {
      setError("Please enter a valid rate");
      return;
    }
    const rateNum = Number(newRate);

    setAddingRate(true);
    setError("");
    try {
      const res = await axios.post(
        `${API}/rate`,
        { type, rate: rateNum, unit: "hour" },
        { withCredentials: true }
      );
      // addRates returns the new rate under `workRate`
      const created =
        res.data.workRate || res.data.rate || res.data.data || { type, rate: rateNum };

      setRates((prev) => [...prev, created]);
      setOriginal((prev) => [...prev, created]); // already saved, so not "unsaved"
      setNewType("");
      setNewRate("");
      setShowAddForm(false);
      flashSaved("New work type added");
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not add work type. Try again."));
    } finally {
      setAddingRate(false);
    }
  }

  async function confirmDelete() {
    const r = deleteTarget;
    if (!r) return;
    const key = rowKey(r);

    // No _id means it was never saved, so just drop it from the list
    if (!r._id) {
      setRates((prev) => prev.filter((x) => rowKey(x) !== key));
      setOriginal((prev) => prev.filter((x) => rowKey(x) !== key));
      setDeleteTarget(null);
      return;
    }

    setDeletingKey(key);
    setError("");
    try {
      await axios.delete(`${API}/rate/${r._id}`, { withCredentials: true });
      setRates((prev) => prev.filter((x) => rowKey(x) !== key));
      setOriginal((prev) => prev.filter((x) => rowKey(x) !== key));
      flashSaved("Work type deleted");
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not delete work type. Try again."));
    } finally {
      setDeletingKey(null);
      setDeleteTarget(null);
    }
  }

  /* ---------------- Loading ---------------- */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-24 animate-pulse rounded-[2rem] bg-emerald-900/10" />
        <div className="h-48 animate-pulse rounded-[2rem] bg-stone-200/70" />
        <div className="h-80 animate-pulse rounded-[2rem] bg-stone-200/70" />
      </div>
    );
  }

  /* ---------------- Main ---------------- */

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-28">
      {/* Header */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[36px] border-white/5" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <SettingsIcon size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-emerald-100/80">
              Manage your tractor details and default work rates
            </p>
          </div>
        </div>
      </header>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200"
            role="alert"
          >
            <span className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </span>
            <button
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 text-rose-400 transition hover:text-rose-600"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tractor details */}
      <section className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Tractor size={20} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Tractor Details</h2>
            <p className="text-xs text-stone-400">Shown in the sidebar's Tractor Status</p>
          </div>
        </div>
        <TractorDetailsForm />
      </section>

      {/* Work rates */}
      <section className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-100/60 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Coins size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">Work Rates</h2>
              <p className="text-xs text-stone-400">
                Default hourly rate for each work type
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowAddForm((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              showAddForm
                ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
            }`}
          >
            <motion.span
              animate={{ rotate: showAddForm ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              <Plus size={16} />
            </motion.span>
            {showAddForm ? "Cancel" : "Add Work Type"}
          </motion.button>
        </div>

        {/* Stats */}
        {totalRates > 0 && (
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            <MiniStat icon={Layers} label="Work types" value={totalRates} />
            <MiniStat icon={Wallet} label="Average" value={`₹${avgRate}/hr`} />
            <MiniStat icon={TrendingUp} label="Highest" value={`₹${maxRate}/hr`} />
          </div>
        )}

        {/* Add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative overflow-hidden"
            >
              <div className="mt-6 rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  New work type
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    autoFocus
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNewRate()}
                    placeholder="e.g. Rotavator, Harvesting..."
                    maxLength={50}
                    className={`${inputBase} ${inputOk} flex-1 px-4`}
                  />

                  <div className="relative sm:w-40">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addNewRate()}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Rate / hr"
                      className={`${inputBase} ${inputOk} pl-8 pr-3`}
                    />
                  </div>

                  <button
                    onClick={addNewRate}
                    disabled={addingRate}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-60"
                  >
                    {addingRate ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rate list */}
        <div className="relative mt-6">
          {rates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl border-2 border-dashed border-stone-200 py-14 text-center"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                <Coins size={24} />
              </div>
              <p className="text-sm font-bold text-stone-600">No work rates yet</p>
              <p className="mt-1 text-xs text-stone-400">
                Click &quot;Add Work Type&quot; to create your first one.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {rates.map((r, i) => {
                  const key = rowKey(r);
                  const invalid = isInvalidRate(r.rate);
                  const changed =
                    original[i] && String(original[i].rate) !== String(r.rate);

                  return (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="group flex items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-100 transition hover:bg-white hover:shadow-md hover:shadow-stone-900/5 sm:gap-4 sm:p-3.5"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                        <ClipboardList size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-stone-800">
                          {r.type}
                        </p>
                        <p className="text-xs text-stone-400">
                          {changed ? (
                            <span className="font-semibold text-amber-600">
                              Edited — unsaved
                            </span>
                          ) : (
                            "per hour"
                          )}
                        </p>
                      </div>

                      <div className="relative w-28 shrink-0 sm:w-40">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={r.rate}
                          onChange={(e) => updateRate(i, e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          aria-label={`Rate for ${r.type}`}
                          aria-invalid={invalid}
                          className={`${inputBase} ${
                            invalid ? inputBad : inputOk
                          } py-2.5 pl-8 pr-9`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs font-medium text-stone-400 sm:block">
                          /hr
                        </span>
                      </div>

                      {/* Always visible on mobile (no hover), hover-only on desktop */}
                      <button
                        onClick={() => setDeleteTarget(r)}
                        disabled={deletingKey === key}
                        title="Delete work type"
                        aria-label={`Delete ${r.type}`}
                        className="shrink-0 rounded-xl p-2 text-stone-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        {deletingKey === key ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Sticky unsaved-changes bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-stone-900 p-3 pl-5 text-white shadow-2xl shadow-black/30"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Unsaved changes
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={discardChanges}
                disabled={savingRates}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-stone-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Discard
              </button>
              <button
                onClick={saveRates}
                disabled={savingRates}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-60"
              >
                {savingRates ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {savingRates ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast (single source of feedback) */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed right-4 z-50 flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-stone-800 shadow-2xl shadow-stone-900/15 ring-1 ring-stone-900/5 sm:right-8 ${
              dirty ? "bottom-24" : "bottom-6 sm:bottom-8"
            }`}
            role="status"
          >
            <CheckCircle2 size={18} className="text-emerald-500" />
            {saved}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
            onClick={() => !deletingKey && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 10 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 size={22} />
              </div>

              <h3 className="mt-4 text-lg font-extrabold text-stone-900">
                Delete &quot;{deleteTarget.type}&quot;?
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                This work type will be removed permanently. Existing work records
                will not be affected.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={Boolean(deletingKey)}
                  className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
                >
                  Keep it
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={Boolean(deletingKey)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {deletingKey && <Loader2 size={15} className="animate-spin" />}
                  {deletingKey ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
        <Icon size={13} className="text-emerald-600" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-extrabold tabular-nums text-stone-900">
        {value}
      </p>
    </div>
  );
}