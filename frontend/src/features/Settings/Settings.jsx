import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import PrimaryButton from "../../components/UI/PrimaryButton";
import {
  ClipboardList,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
  Coins,
  Wallet,
} from "lucide-react";
import axios from "axios";
import TractorDetailsForm from "../../components/TractorDetailsForm";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

// Server ka message mile to wahi dikhao, warna default
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function Settings() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRates, setSavingRates] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState("");
  const [newRate, setNewRate] = useState("");

  const savedTimer = useRef(null);

  useEffect(() => {
    fetchRates();
    return () => clearTimeout(savedTimer.current); // page chhodne par timer band
  }, []);

  async function fetchRates() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/rate/rates`, { withCredentials: true });
      setRates(res.data.rates || res.data.data || []);
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not load rates. Please refresh."));
    } finally {
      setLoading(false);
    }
  }

  // Typing ke dauran text hi rakho (taaki field khali karke naya number likh sako)
  function updateRate(i, val) {
    setRates((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], rate: val };
      return next;
    });
  }

  function flashSaved(msg) {
    setSaved(msg);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(""), 2000);
  }

  async function saveRates() {
    // Save se pehle har rate check karo
    for (const r of rates) {
      const n = Number(r.rate);
      if (r.rate === "" || !Number.isFinite(n) || n < 0) {
        setError(`"${r.type}" ka rate sahi daalo (0 ya usse zyada)`);
        return;
      }
    }

    setSavingRates(true);
    setError("");
    try {
      // unit hamesha "hour": billing per hour ke hisaab se hoti hai
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
      if (res.data.rates) setRates(res.data.rates);
      flashSaved("Rates saved successfully");
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not save rates. Try again."));
    } finally {
      setSavingRates(false);
    }
  }

  async function addNewRate() {
    const type = newType.trim();
    if (!type) {
      setError("Please enter a work type name");
      return;
    }
    const rateNum = newRate === "" ? NaN : Number(newRate);
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setError("Please enter a valid rate");
      return;
    }

    setAddingRate(true);
    setError("");
    try {
      const res = await axios.post(
        `${API}/rate`,
        { type, rate: rateNum, unit: "hour" },
        { withCredentials: true }
      );
      // addRates ka response `workRate` me aata hai
      const created =
        res.data.workRate || res.data.rate || res.data.data || { type, rate: rateNum };

      setRates((prev) => [...prev, created]);
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

  // Pehle sirf screen se hat-ta tha, DB se nahi. Ab sach me delete hota hai.
  async function deleteRate(i) {
    const r = rates[i];
    if (!window.confirm(`"${r.type}" delete karna hai? Purane kaam ke records par asar nahi padega.`)) {
      return;
    }

    // _id nahi hai to ye abhi tak save hi nahi hua, bas list se hata do
    if (!r._id) {
      setRates((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }

    setDeletingId(r._id);
    setError("");
    try {
      await axios.delete(`${API}/rate/${r._id}`, { withCredentials: true });
      setRates((prev) => prev.filter((x) => x._id !== r._id));
      flashSaved("Work type delete ho gaya");
    } catch (err) {
      console.error(err);
      setError(errMsg(err, "Could not delete work type. Try again."));
    } finally {
      setDeletingId(null);
    }
  }

  const totalRates = rates.length;
  const avgRate = totalRates
    ? Math.round(rates.reduce((sum, r) => sum + (Number(r.rate) || 0), 0) / totalRates)
    : 0;

  if (loading) {
    return (
      <div className="max-w-3xl flex items-center gap-2 text-slate-400 text-sm py-16 justify-center">
        <Loader2 size={18} className="animate-spin" /> Loading rates...
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your tractor details and default work rates" />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between"
            role="alert"
          >
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              aria-label="Error band karo"
              className="text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tractor ki detail (sidebar ke Tractor Status me dikhti hai) */}
      <div className="mb-6">
        <TractorDetailsForm />
      </div>

      {/* Work Rates */}
      <Card className="p-6 overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between mb-1">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Manage Work Rates</h3>
            <p className="text-xs text-slate-400 mt-1">
              Set the default hourly rate for each work type
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl shadow-sm shadow-green-200 transition-colors shrink-0"
          >
            <motion.span
              animate={{ rotate: showAddForm ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              <Plus size={15} />
            </motion.span>
            {showAddForm ? "Cancel" : "Add Work Type"}
          </motion.button>
        </div>

        {totalRates > 0 && (
          <div className="relative flex flex-wrap gap-3 mt-4 mb-5">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <ClipboardList size={14} className="text-green-600" />
              <span className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{totalRates}</span> work type
                {totalRates !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <Wallet size={14} className="text-green-600" />
              <span className="text-xs text-slate-500">
                Avg <span className="font-semibold text-slate-800">₹{avgRate}</span>/hour
              </span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: "auto", opacity: 1, marginBottom: 20 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden relative"
            >
              <div className="p-4 rounded-2xl border border-dashed border-green-300 bg-green-50/50">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNewRate()}
                    placeholder="e.g. Rotavator, Harvesting..."
                    maxLength={50}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                  />
                  <div className="relative w-full sm:w-40">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addNewRate()}
                      placeholder="Rate"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={addNewRate}
                    disabled={addingRate}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {addingRate ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Plus size={15} />
                    )}
                    Add
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {rates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative text-center py-14 text-slate-400"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Coins size={24} className="opacity-40" />
            </div>
            <p className="text-sm">No work rates yet.</p>
            <p className="text-xs mt-1">Click "Add Work Type" above to create one.</p>
          </motion.div>
        ) : (
          <div className="relative space-y-2.5">
            <AnimatePresence initial={false}>
              {rates.map((r, i) => (
                <motion.div
                  key={r._id || r.type}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    x: -20,
                    height: 0,
                    marginBottom: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="group flex items-center gap-3 sm:gap-4 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 hover:shadow-sm transition-all overflow-hidden"
                >
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-green-600 shrink-0">
                    <ClipboardList size={16} />
                  </div>
                  <span className="font-medium text-slate-700 flex-1 truncate">{r.type}</span>
                  <div className="relative w-28 sm:w-36 shrink-0">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={r.rate}
                      onChange={(e) => updateRate(i, e.target.value)}
                      aria-label={`${r.type} ka rate`}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    />
                  </div>
                  <span className="hidden sm:block text-xs text-slate-400 w-10 shrink-0">/hour</span>
                  {/* Mobile pe hover nahi hota, isliye wahan hamesha dikhta hai */}
                  <button
                    onClick={() => deleteRate(i)}
                    disabled={deletingId === r._id}
                    title="Delete work type"
                    aria-label={`${r.type} delete karo`}
                    className="sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0 disabled:opacity-50"
                  >
                    {deletingId === r._id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="relative mt-6 flex items-center gap-3">
          <PrimaryButton onClick={saveRates} icon={CheckCircle2} disabled={savingRates}>
            {savingRates ? "Saving..." : "Save Changes"}
          </PrimaryButton>
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-green-600 font-medium flex items-center gap-1"
              >
                <CheckCircle2 size={13} /> {saved}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="toast fixed bottom-8 right-8 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2"
            role="status"
          >
            <CheckCircle2 size={16} className="text-green-400" />
            {saved}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}