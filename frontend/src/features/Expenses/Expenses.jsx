import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  StickyNote,
  IndianRupee,
  Wallet,
  Receipt,
  Layers,
  Pencil,
  Trash2,
  Loader2,
  Inbox,
} from "lucide-react";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";

import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Field from "../../components/UI/Field";
import PrimaryButton from "../../components/UI/PrimaryButton";
import { EXPENSES, EXPENSETYPES, EXPENSEICONS, inr } from "../../data/mockData";

const EMPTY_FORM = {
  type: EXPENSETYPES[0] || "Diesel",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

// Best-effort Hindi aliases for common expense types, used so voice input
// like "डीजल" or "मरम्मत" can match an English-labelled EXPENSETYPES entry.
const TYPE_ALIASES = {
  diesel: ["डीजल", "डीज़ल", "तेल"],
  repair: ["रिपेयर", "मरम्मत"],
  maintenance: ["मेंटेनेंस", "देखभाल"],
  other: ["अन्य", "other"],
};
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function Expenses() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [data, setData] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message }

  const recognitionRef = useRef(null);

  const totalExpense = data.reduce((s, e) => s + Number(e.amount || 0), 0);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 1800);
  };

  const dateFormat = (date) => new Date(date).toLocaleDateString("en-IN");

  const handleField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Voice input ----
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
      text.match(/\b(\d+)\b/); // fallback: first bare number in the sentence

    const isToday = /आज/.test(text);
    const isTomorrow = /कल/.test(text);
    let date;
    if (isToday) date = new Date().toISOString().slice(0, 10);
    if (isTomorrow) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      date = d.toISOString().slice(0, 10);
    }

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

  const stopListening = () => recognitionRef.current?.stop();

  const startListening = () => {
    if (listening) {
      stopListening();
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

    recognition.onerror = () => {
      setListening(false);
      showToast("error", "Couldn't catch that. Try again.");
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  // ---- Submit ----
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast("error", "Enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: formData.type,
        amount: Number(formData.amount),
        date: formData.date,
        notes: formData.notes,
      };

      // NOTE: endpoint assumed to follow the same "/add" convention used
      // elsewhere in the app (e.g. /api/work/add). Adjust if your backend differs.
      const res = await axios.post(`${API}/expenses/add`, payload, {
        withCredentials: true,
      });

      const created = res.data?.expense || { ...payload, _id: res.data?._id || Date.now() };
      setData((prev) => [created, ...prev]);

      showToast("success", "Expense added successfully");
      setFormData(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;

    setDeletingId(id);
    const prevData = data;
    setData((prev) => prev.filter((e) => e._id !== id)); // optimistic

    try {
      // NOTE: endpoint assumed — adjust to match your backend route.
      await axios.delete(`${API}/expenses/${id}`, {
        withCredentials: true,
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <PageHeader title="Expenses" subtitle="Track diesel, repair and maintenance costs" />
        </div>

        {/* Stat strip */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total spent</p>
              <p className="text-lg font-bold text-slate-900">{inr(totalExpense)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Entries</p>
              <p className="text-lg font-bold text-slate-900">{data.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Types tracked</p>
              <p className="text-lg font-bold text-slate-900">{EXPENSETYPES.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="h-fit rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Add Expense</h3>
              <button
                type="button"
                onClick={startListening}
                className="flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs transition-colors hover:bg-green-600 hover:text-white"
              >
                {listening ? <FiMicOff size={16} /> : <IoMicOutline size={16} />}
                {listening ? "Listening..." : "Voice"}
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <Field label="Expense Type">
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSETYPES.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => handleField("type", t)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs transition-colors ${
                        t === formData.type
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          t === formData.type ? "bg-green-100 text-green-700" : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {renderTypeIcon(t, 15)}
                      </div>
                      <div>{t}</div>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Amount">
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.amount}
                    onChange={(e) => handleField("amount", e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              <Field label="Date">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleField("date", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              <Field label="Notes">
                <div className="relative">
                  <StickyNote className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleField("notes", e.target.value)}
                    placeholder="Optional notes..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center">
                {submitting ? "Saving..." : "Add Expense"}
              </PrimaryButton>
            </form>
          </Card>

          <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Expense History</h3>
              <span className="text-sm font-bold text-slate-900">Total {inr(totalExpense)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3.5 font-medium">Type</th>
                    <th className="py-3.5 font-medium">Amount</th>
                    <th className="py-3.5 font-medium">Date</th>
                    <th className="py-3.5 font-medium">Notes</th>
                    <th className="py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <Loader2 className="mx-auto mb-2 animate-spin" size={20} />
                        Loading expenses...
                      </td>
                    </tr>
                  )}

                  {!loadingList && data.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <Inbox className="mx-auto mb-2" size={22} />
                        No expenses recorded yet
                      </td>
                    </tr>
                  )}

                  {!loadingList &&
                    data.map((e) => (
                      <tr
                        key={e._id}
                        className="border-b transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                              {renderTypeIcon(e.type, 15)}
                            </div>
                            <span className="font-medium text-slate-700">{e.type}</span>
                          </div>
                        </td>
                        <td className="py-3.5 font-semibold text-slate-800">{inr(e.amount)}</td>
                        <td className="py-3.5 text-slate-500">{dateFormat(e.date)}</td>
                        <td className="max-w-[180px] truncate py-3.5 text-slate-400">{e.notes}</td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e._id)}
                            disabled={deletingId === e._id}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === e._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {toast && (
        <div
          className={`toast fixed bottom-8 right-8 rounded-xl px-4 py-2 text-white shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}