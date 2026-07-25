import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  Clock3,
  IndianRupee,
  Tractor,
  UserRound,
  Hash,
  BadgeIndianRupee,
  ArrowLeft,
  Wallet,
} from "lucide-react";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Field from "../../components/UI/Field";
import PrimaryButton from "../../components/UI/PrimaryButton";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

// Combine a yyyy-mm-dd date with the current wall-clock time, so records
// logged for "today" get a realistic startTime instead of midnight.
function buildStartTime(dateStr) {
  const now = new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(
    y,
    (m || 1) - 1,
    d || 1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  ).toISOString();
}

export default function AddWork() {
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState([]);
  const [rates, setRates] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const [form, setForm] = useState({
    farmer: "",
    fieldName: "",
    workType: "",
    totalMinutes: "",
    paidAmount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [farmersRes, ratesRes] = await Promise.all([
          axios.post(
            `${API_BASE}/api/farmer/all-farmer`,
            {},
            { withCredentials: true }
          ),
          axios.get(`${API_BASE}/api/rate/rates`, {
            withCredentials: true,
          }),
        ]);

        if (cancelled) return;

        const farmerList = farmersRes.data?.all || farmersRes.data?.farmers || [];
        const rateList = ratesRes.data?.rates || [];

        setFarmers(farmerList);
        setRates(rateList);

        setForm((prev) => ({
          ...prev,
          farmer: prev.farmer || farmerList[0]?._id || "",
          workType: prev.workType || rateList[0]?.type || "",
        }));
      } catch (err) {
        console.error("Failed to load farmers/rates:", err);
        if (!cancelled) {
          setOptionsError("Couldn't load farmers or work rates.");
          toast.error("Failed to load farmers or work rates");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRate = useMemo(
    () => rates.find((r) => r.type === form.workType) || null,
    [rates, form.workType]
  );

  const ratePerHour = selectedRate?.rate || 0;

  const calculatedAmount = useMemo(() => {
    const minutes = Number(form.totalMinutes || 0);
    return Math.ceil((minutes / 60) * ratePerHour);
  }, [form.totalMinutes, ratePerHour]);

  const dueAmount = useMemo(() => {
    const paid = Number(form.paidAmount || 0);
    return Math.max(calculatedAmount - paid, 0);
  }, [calculatedAmount, form.paidAmount]);

  const paidRatio =
    calculatedAmount > 0
      ? Math.min(Number(form.paidAmount || 0) / calculatedAmount, 1)
      : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Voice input ----
  // Speech recognition (lang="hi-IN") returns Devanagari text, so the
  // keywords searched for are Devanagari too: "किसान/फार्मर" (farmer),
  // "फील्ड/खेत" (field name), "वर्क टाइप/काम" (work type),
  // "मिनट/टाइम" (minutes), "पेड/भुगतान/पेमेंट" (paid amount).
  const parseVoiceText = (text) => {
    const KEYWORDS =
      "किसान|फार्मर|फील्ड|खेत|वर्क टाइप|काम|मिनट|टाइम|पेड|भुगतान|पेमेंट|डेट|तारीख";

    const farmerMatch = text.match(
      new RegExp(`(?:किसान|फार्मर)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`)
    );
    const fieldMatch = text.match(
      new RegExp(`(?:फील्ड|खेत)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`)
    );
    const workTypeMatch = text.match(
      new RegExp(`(?:वर्क टाइप|काम)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`)
    );

    // Numbers can appear before or after the keyword: "120 मिनट" or "मिनट 120"
    const minutesMatch =
      text.match(/(\d+)\s*(?:मिनट|टाइम)/) || text.match(/(?:मिनट|टाइम)\s*(\d+)/);
    const paidMatch =
      text.match(/(\d+)\s*(?:रुपये|रुपए)?\s*(?:पेड|भुगतान|पेमेंट)/) ||
      text.match(/(?:पेड|भुगतान|पेमेंट)\s*(\d+)/);

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
      farmerName: farmerMatch?.[1]?.trim() || "",
      fieldName: fieldMatch?.[1]?.trim() || "",
      workType: workTypeMatch?.[1]?.trim() || "",
      totalMinutes: minutesMatch?.[1] || "",
      paidAmount: paidMatch?.[1] || "",
      date,
    };
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    if (listening) {
      stopListening();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const parsed = parseVoiceText(text);

      setForm((prev) => {
        const next = { ...prev };

        if (parsed.fieldName) next.fieldName = parsed.fieldName;
        if (parsed.totalMinutes) next.totalMinutes = parsed.totalMinutes;
        if (parsed.paidAmount) next.paidAmount = parsed.paidAmount;
        if (parsed.date) next.date = parsed.date;

        // Match spoken work type against the rates loaded from Settings
        if (parsed.workType) {
          const matchedRate = rates.find(
            (r) =>
              r.type.toLowerCase().includes(parsed.workType.toLowerCase()) ||
              parsed.workType.toLowerCase().includes(r.type.toLowerCase())
          );
          if (matchedRate) next.workType = matchedRate.type;
        }

        return next;
      });

      // Match spoken farmer name against the loaded farmers list
      if (parsed.farmerName) {
        const matchedFarmer = farmers.find((f) =>
          f.name?.toLowerCase().includes(parsed.farmerName.toLowerCase())
        );
        if (matchedFarmer) {
          setForm((prev) => ({ ...prev, farmer: matchedFarmer._id }));
        } else {
          toast.error(`Farmer "${parsed.farmerName}" not found in list`);
        }
      }
    };

    recognition.onerror = () => {
      setListening(false);
      toast.error("Couldn't catch that. Try again.");
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.farmer) return toast.error("Please select a farmer");
    if (!form.fieldName.trim()) return toast.error("Field name is required");
    if (!form.workType) return toast.error("Please select a work type");
    if (!form.totalMinutes || Number(form.totalMinutes) <= 0)
      return toast.error("Total minutes is required");
    if (!selectedRate) {
      return toast.error(
        `No rate set for "${form.workType}" — add one in Settings first`
      );
    }

    try {
      setSubmitting(true);

      // Field names/shape here match the real /api/work/add contract:
      // the backend looks up the rate itself from workRate (an id into
      // the WorkRate collection) rather than trusting a client-sent
      // ratePerHour.
      const payload = {
        farmerId: form.farmer,
        fieldName: form.fieldName,
        workType: form.workType,
        workRate: selectedRate._id,
        startTime: buildStartTime(form.date),
        totalMinutes: Number(form.totalMinutes || 0),
        paidAmount: Number(form.paidAmount || 0),
        date: form.date,
      };

      const res = await axios.post(`${API_BASE}/api/work/add`, payload, {
        withCredentials: true,
      });

      toast.success(res.data?.message || "Work record added successfully");

      setForm((prev) => ({
        ...prev,
        fieldName: "",
        workType: rates[0]?.type || "",
        totalMinutes: "",
        paidAmount: "",
        date: new Date().toISOString().slice(0, 10),
      }));
    } catch (err) {
      console.error("Add work failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to add work record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <PageHeader
            title="Add Work Record"
            subtitle="Create a new tractor work entry"
            action={
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startListening}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition-colors ${
                    listening
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-slate-200 hover:bg-emerald-600 hover:text-white"
                  }`}
                >
                  {listening ? <FiMicOff size={18} /> : <IoMicOutline size={18} />}
                  {listening ? "Listening..." : "Voice"}
                </button>

                <PrimaryButton
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back
                </PrimaryButton>
              </div>
            }
          />
        </div>

        <Card className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          {loadingOptions ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[52px] animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : optionsError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-red-500">{optionsError}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-full bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                Retry
              </button>
            </div>
          ) : rates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-slate-500">
                No work rates set up yet — add at least one rate in Settings
                before logging work.
              </p>
              <PrimaryButton onClick={() => navigate("/settings")}>
                Go to Settings
              </PrimaryButton>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              <Field label="Farmer">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    name="farmer"
                    value={form.farmer}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Select farmer</option>
                    {farmers.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.village})
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Field Name">
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="fieldName"
                    value={form.fieldName}
                    onChange={handleChange}
                    placeholder="Enter field name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              <Field label="Work Type">
                <div className="relative">
                  <Tractor className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    name="workType"
                    value={form.workType}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    {rates.map((r) => (
                      <option key={r._id || r.type} value={r.type}>
                        {r.type}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Rate / Hour">
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={ratePerHour ? `₹${ratePerHour}` : "Not set"}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm text-slate-600 outline-none"
                  />
                </div>
              </Field>

              <Field label="Total Minutes">
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="totalMinutes"
                    type="number"
                    min="1"
                    value={form.totalMinutes}
                    onChange={handleChange}
                    placeholder="e.g. 120"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              <Field label="Paid Amount">
                <div className="relative">
                  <BadgeIndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="paidAmount"
                    type="number"
                    min="0"
                    value={form.paidAmount}
                    onChange={handleChange}
                    placeholder="e.g. 500"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              <Field label="Date">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </Field>

              {/* Live summary — the signature element: a small paid/due
                  progress bar so the split is visible at a glance, not
                  just as two numbers. */}
              <div className="sm:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <Wallet size={15} />
                  Payment summary
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-emerald-700/70">Total</p>
                    <p className="font-semibold text-emerald-900">
                      ₹{Number(calculatedAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700/70">Paid</p>
                    <p className="font-semibold text-emerald-900">
                      ₹{Number(form.paidAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700/70">Due</p>
                    <p
                      className={`font-semibold ${
                        dueAmount > 0 ? "text-red-600" : "text-emerald-900"
                      }`}
                    >
                      ₹{Number(dueAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${paidRatio * 100}%` }}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <PrimaryButton
                  type="submit"
                  disabled={submitting}
                  className="min-w-44"
                >
                  {submitting ? "Saving..." : "Save Work Record"}
                </PrimaryButton>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}