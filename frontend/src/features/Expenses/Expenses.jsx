import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  StickyNote,
  IndianRupee,
  Wallet,
  Receipt,
  Pencil,
  Trash2,
  Loader2,
  Inbox,
  CheckCircle2,
  AlertCircle,
  CalendarRange,
  X,
  Plus,
  Save,
} from "lucide-react";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";

import { EXPENSETYPES, EXPENSEICONS, inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, "0");

// Local-time date key (toISOString() is UTC and gives the wrong day in IST mornings)
const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDateInput = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return localDate();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Built fresh each time so the date is never stale after midnight
const getEmptyForm = () => ({
  type: EXPENSETYPES[0] || "Diesel",
  amount: "",
  date: localDate(),
  notes: "",
});

const formatDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Best-effort Hindi aliases so voice input like "डीजल" matches an English EXPENSETYPES entry.
const TYPE_ALIASES = {
  diesel: ["डीजल", "डीज़ल", "तेल"],
  repair: ["रिपेयर", "मरम्मत"],
  maintenance: ["मेंटेनेंस", "देखभाल"],
  other: ["अन्य", "other"],
};

const inputCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

/* ------------------------------ page ------------------------------ */

export default function Expenses() {
  const [formData, setFormData] = useState(getEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [data, setData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message }

  const recognitionRef = useRef(null);
  const toastTimer = useRef(null);
  const formRef = useRef(null);

  /* ---------------- toast ---------------- */

  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  /* ---------------- fetch ---------------- */

  const fetchData = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(`${API}/expenses/all-expenses`, {
        withCredentials: true,
      });
      setData(res.data?.expenses || []);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to load expenses");
    } finally {
      setLoadingList(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
    return () => {
      clearTimeout(toastTimer.current);
      recognitionRef.current?.abort?.(); // stop the mic if the page is left
    };
  }, [fetchData]);

  /* ---------------- derived ---------------- */

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [data]
  );

  const { totalExpense, monthExpense } = useMemo(() => {
    const thisMonth = localDate().slice(0, 7);
    let total = 0;
    let month = 0;
    data.forEach((e) => {
      const amt = Number(e.amount || 0);
      total += amt;
      if (toDateInput(e.date).slice(0, 7) === thisMonth) month += amt;
    });
    return { totalExpense: total, monthExpense: month };
  }, [data]);

  const handleField = (name, value) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  /* ---------------- voice input ---------------- */
  // hi-IN recognition returns Devanagari, so keywords + type aliases are Devanagari.

  const parseVoiceText = (text) => {
    const KEYWORDS = "टाइप|प्रकार|अमाउंट|राशि|डेट|तारीख|नोट|नोट्स";

    const typeMatch = text.match(
      new RegExp(`(?:टाइप|प्रकार)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`)
    );
    const notesMatch = text.match(/(?:नोट्स|नोट)\s+(.+)/);
    const amountMatch =
      text.match(/(\d+)\s*(?:रुपये|रुपए)?\s*(?:अमाउंट|राशि)/) ||
      text.match(/(?:अमाउंट|राशि)\s*(\d+)/) ||
      text.match(/\b(\d+)\b/); // fallback: first bare number

    // "कल" means both yesterday and tomorrow in Hindi. Expenses are almost always
    // already spent, so it's treated as yesterday.
    let date;
    if (/आज/.test(text)) date = localDate();
    else if (/कल/.test(text)) date = localDate(-1);

    return {
      typeSpoken: typeMatch?.[1]?.trim() || "",
      amount: amountMatch?.[1] || "",
      notes: notesMatch?.[1]?.trim() || "",
      date,
    };
  };

  const matchExpenseType = (spoken) => {
    if (!spoken) return null;
    const lower = spoken.toLowerCase();

    const direct = EXPENSETYPES.find(
      (t) => t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase())
    );
    if (direct) return direct;

    const aliasHit = Object.entries(TYPE_ALIASES).find(([, aliases]) =>
      aliases.some((a) => lower.includes(a.toLowerCase()))
    );
    if (aliasHit) {
      const [key] = aliasHit;
      return EXPENSETYPES.find((t) => t.toLowerCase() === key) || null;
    }
    return null;
  };

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("error", "Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const parsed = parseVoiceText(text);
      const matchedType = matchExpenseType(parsed.typeSpoken);

      setFormData((prev) => ({
        ...prev,
        type: matchedType || prev.type,
        amount: parsed.amount || prev.amount,
        notes: parsed.notes || prev.notes,
        date: parsed.date || prev.date,
      }));
    };

    recognition.onerror = (event) => {
      setListening(false);
      showToast(
        "error",
        event?.error === "not-allowed"
          ? "Microphone permission is blocked."
          : "Couldn't catch that. Try again."
      );
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  /* ---------------- submit (add / update) ---------------- */

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingId(null);
  };

  const startEdit = (expense) => {
    setEditingId(expense._id);
    setFormData({
      type: expense.type || EXPENSETYPES[0] || "Diesel",
      amount: String(expense.amount ?? ""),
      date: toDateInput(expense.date),
      notes: expense.notes || "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast("error", "Enter a valid amount");
      return;
    }

    const payload = {
      type: formData.type,
      amount: Number(formData.amount),
      date: formData.date,
      notes: formData.notes,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        // NOTE: PUT /expenses/:id is assumed (mirrors the DELETE route). Adjust if your backend differs.
        const res = await axios.put(`${API}/expenses/${editingId}`, payload, {
          withCredentials: true,
        });
        const updated = res.data?.expense || payload;
        setData((prev) =>
          prev.map((x) => (x._id === editingId ? { ...x, ...updated } : x))
        );
        showToast("success", "Expense updated");
      } else {
        // NOTE: /expenses/add is assumed to follow the same convention as /work/add.
        const res = await axios.post(`${API}/expenses/add`, payload, {
          withCredentials: true,
        });
        const created = res.data?.expense || {
          ...payload,
          _id: res.data?._id || String(Date.now()),
        };
        setData((prev) => [created, ...prev]);
        showToast("success", "Expense added successfully");
      }
      resetForm();
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err.response?.data?.message ||
          (editingId ? "Failed to update expense" : "Failed to add expense")
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- delete ---------------- */

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;

    setDeletingId(target._id);
    const prevData = data;
    setData((prev) => prev.filter((x) => x._id !== target._id)); // optimistic
    setDeleteTarget(null);

    try {
      // NOTE: endpoint assumed — adjust to match your backend route.
      await axios.delete(`${API}/expenses/${target._id}`, { withCredentials: true });
      if (editingId === target._id) resetForm();
      showToast("success", "Expense deleted");
    } catch (err) {
      console.error(err);
      setData(prevData); // rollback
      showToast("error", "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  };

  const renderTypeIcon = (t, size = 16) => {
    const IconComp = EXPENSEICONS?.[t];
    if (typeof IconComp === "function") {
      const Comp = IconComp;
      return <Comp size={size} />;
    }
    return <Receipt size={size} />;
  };

  const isEditing = Boolean(editingId);

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-white/15">
              <Wallet size={13} />
              Expenses
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Track diesel, repair and maintenance
            </h1>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
              Total spent
            </p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight">
              {inr(totalExpense)}
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70">
                <CalendarRange size={12} />
                This month
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">
                {inr(monthExpense)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70">
                <Receipt size={12} />
                Entries
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">{data.length}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        {/* Form */}
        <section
          ref={formRef}
          className={`rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 xl:sticky xl:top-6 xl:col-span-2 ${
            isEditing ? "ring-2 ring-amber-300" : "ring-stone-900/5"
          }`}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">
                {isEditing ? "Edit Expense" : "Add Expense"}
              </h2>
              <p className="text-xs text-stone-400">
                {isEditing ? "Update the details and save" : "Type it in, or use your voice"}
              </p>
            </div>

            <button
              type="button"
              onClick={startListening}
              aria-pressed={listening}
              className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                listening
                  ? "animate-pulse bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white"
              }`}
            >
              {listening ? <FiMicOff size={16} /> : <IoMicOutline size={16} />}
              {listening ? "Listening..." : "Voice"}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                Expense type
              </span>
              <div className="grid grid-cols-3 gap-2">
                {EXPENSETYPES.map((t) => {
                  const active = t === formData.type;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => handleField("type", t)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-2 rounded-2xl py-3.5 text-xs font-bold transition ${
                        active
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                          : "bg-stone-50 text-stone-500 ring-1 ring-stone-200 hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-200"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                          active ? "bg-white/20" : "bg-white"
                        }`}
                      >
                        {renderTypeIcon(t, 16)}
                      </span>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                Amount
              </span>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  required
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => handleField("amount", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 1500"
                  className={inputCls}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                Date
              </span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleField("date", e.target.value)}
                  className={inputCls}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400">
                Notes
              </span>
              <div className="relative">
                <StickyNote className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-stone-400" />
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleField("notes", e.target.value)}
                  placeholder="Optional notes..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isEditing ? (
                  <Save size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {submitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Expense"
                    : "Add Expense"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-2xl bg-stone-100 px-4 py-3.5 text-sm font-bold text-stone-600 transition hover:bg-stone-200 disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* History */}
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-stone-100 p-6">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">Expense History</h2>
              <p className="text-xs text-stone-400">Newest first</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
              Total {inr(totalExpense)}
            </span>
          </div>

          {loadingList ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
                <Inbox size={28} />
              </div>
              <p className="mt-4 font-bold text-stone-700">No expenses recorded yet</p>
              <p className="mt-1 text-sm text-stone-400">
                Add your first expense using the form.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {sorted.map((e) => (
                <li
                  key={e._id}
                  className={`group flex items-center gap-4 px-6 py-4 transition hover:bg-emerald-50/40 ${
                    editingId === e._id ? "bg-amber-50/60" : ""
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    {renderTypeIcon(e.type, 20)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">{e.type}</p>
                    <p className="truncate text-xs text-stone-500">
                      {formatDate(e.date)}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  </div>

                  <p className="shrink-0 text-base font-extrabold tabular-nums text-stone-900">
                    {inr(e.amount)}
                  </p>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      className="rounded-xl p-2 text-stone-300 transition hover:bg-emerald-50 hover:text-emerald-600"
                      title="Edit"
                      aria-label={`Edit ${e.type} expense`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(e)}
                      disabled={deletingId === e._id}
                      className="rounded-xl p-2 text-stone-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                      title="Delete"
                      aria-label={`Delete ${e.type} expense`}
                    >
                      {deletingId === e._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-stone-900">
              Delete this expense?
            </h3>
            <p className="mt-1.5 text-sm text-stone-500">
              {deleteTarget.type} · {inr(deleteTarget.amount)} on{" "}
              {formatDate(deleteTarget.date)} will be removed permanently.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200"
              >
                Keep it
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-4 z-50 flex items-center gap-2.5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-stone-800 shadow-2xl shadow-stone-900/15 ring-1 ring-stone-900/5 sm:bottom-8 sm:right-8"
        >
          {toast.type === "error" ? (
            <AlertCircle size={18} className="text-rose-500" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-500" />
          )}
          {toast.message}
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-1 text-stone-300 transition hover:text-stone-500"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}