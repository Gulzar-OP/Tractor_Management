import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  Clock3,
  IndianRupee,
  Tractor,
  UserRound,
  Hash,
  ArrowLeft,
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sprout,
  Calculator,
  Banknote,
  Smartphone,
  Landmark,
  RefreshCw,
  Receipt,
  ChevronDown,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

/* ------------------------------ helpers ------------------------------ */

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function buildStartTime(dateStr) {
  const now = new Date();
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  ).toISOString();
}

function getWorkDue(work) {
  if (!work) return 0;
  if (work.dueAmount !== undefined && work.dueAmount !== null) {
    return Math.max(0, Number(work.dueAmount));
  }
  const total = Number(work.totalAmount || 0);
  const paid = Number(work.paidAmount || 0);
  return Math.max(0, total - paid);
}

const getWorkAdvance = (work) => Math.max(0, Number(work?.advanceAppliedAmount || 0));

const getArray = (data, extraKeys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of ["all", "farmers", ...extraKeys, "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "BANK", label: "Bank", icon: Landmark },
];

const fieldCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60";

const labelCls = "mb-2 block text-xs font-bold uppercase tracking-wide text-stone-400";

/* ------------------------------ small parts ------------------------------ */

const TILE_TONES = {
  slate: "bg-stone-50 text-stone-800",
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
  amber: "bg-amber-50 text-amber-700",
};

function SummaryTile({ label, value, icon: Icon, tone = "slate" }) {
  return (
    <div className={`rounded-2xl p-3.5 ${TILE_TONES[tone]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide opacity-70">
        <Icon size={13} />
        {label}
      </div>
      <p className="mt-1.5 break-words text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-stone-400"
          />
        )}
        {children}
      </div>
    </label>
  );
}

function Select({ children, ...props }) {
  return (
    <>
      <select {...props} className={`${fieldCls} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
      />
    </>
  );
}

function Stepper({ step }) {
  const steps = [
    { n: 1, label: "Work details" },
    { n: 2, label: "Payment" },
  ];
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <li
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ${
                active
                  ? "bg-white text-emerald-800 ring-white"
                  : done
                    ? "bg-emerald-500/30 text-white ring-emerald-300/40"
                    : "bg-white/10 text-emerald-100/70 ring-white/15"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  active ? "bg-emerald-600 text-white" : "bg-white/20"
                }`}
              >
                {done ? <CheckCircle2 size={12} /> : s.n}
              </span>
              {s.label}
            </li>
            {i < steps.length - 1 && <span className="h-px w-6 bg-white/20" />}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function ResultRow({ label, value, valueCls = "text-stone-800", strong = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-stone-500">{label}</span>
      <span className={`tabular-nums ${strong ? "text-lg font-extrabold" : "font-bold"} ${valueCls}`}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function AddWork() {
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState([]);
  const [rates, setRates] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef(null);

  // Farmer and work type are deliberately NOT pre-selected: a work (and its bill)
  // should never be created against whoever happens to be first in the list.
  const [form, setForm] = useState({
    farmer: "",
    fieldName: "",
    workType: "",
    totalMinutes: "",
    date: getLocalDate(),
  });

  const [createdWork, setCreatedWork] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    note: "",
  });

  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const step = createdWork ? 2 : 1;

  /* ---------------- load options ---------------- */

  const refreshFarmers = useCallback(async () => {
    try {
      const res = await axios.post(`${API}/farmer/all-farmer`, {}, { withCredentials: true });
      setFarmers(getArray(res.data));
    } catch (err) {
      console.error("Farmer refresh failed:", err);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      setOptionsError(null);

      const [farmersRes, ratesRes] = await Promise.all([
        axios.post(`${API}/farmer/all-farmer`, {}, { withCredentials: true }),
        axios.get(`${API}/rate/rates`, { withCredentials: true }),
      ]);

      setFarmers(getArray(farmersRes.data));
      setRates(getArray(ratesRes.data, ["rates"]).length
        ? getArray(ratesRes.data, ["rates"])
        : ratesRes.data?.rates || []);
    } catch (err) {
      console.error("Failed to load options:", err.response?.data || err.message);
      setOptionsError("Couldn't load farmers or work rates.");
      toast.error("Failed to load farmers or work rates");
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  /* ---------------- selected farmer / rate ---------------- */

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f._id === form.farmer) || null,
    [farmers, form.farmer]
  );

  const farmerBilled = Number(selectedFarmer?.totalBilledAmount || 0);
  const farmerPaid = Number(selectedFarmer?.totalPaidAmount || 0);
  const farmerDue = Number(selectedFarmer?.totalDueAmount || 0);
  const farmerAdvance = Number(selectedFarmer?.advanceAmount || 0);

  const farmerStatus =
    farmerDue > 0 ? (farmerPaid > 0 ? "Partial" : "Due") : farmerAdvance > 0 ? "Advance" : "Paid";

  const selectedRate = useMemo(
    () => rates.find((r) => r.type === form.workType) || null,
    [rates, form.workType]
  );

  const ratePerHour = Number(selectedRate?.rate || 0);

  const calculatedAmount = useMemo(() => {
    const minutes = Number(form.totalMinutes || 0);
    if (minutes <= 0 || ratePerHour <= 0) return 0;
    return Math.ceil((minutes / 60) * ratePerHour);
  }, [form.totalMinutes, ratePerHour]);

  /* ---------------- created work / payment maths ---------------- */

  const workDue = getWorkDue(createdWork);
  const workTotal = Number(createdWork?.totalAmount || calculatedAmount || 0);
  const workAdvance = getWorkAdvance(createdWork);

  const enteredPayment = Number(paymentForm.amount || 0);
  const validPayment = Number.isFinite(enteredPayment) && enteredPayment > 0;
  const paymentRemaining = Math.max(0, workDue - enteredPayment);
  const paymentExcess = Math.max(0, enteredPayment - workDue);

  /* ---------------- handlers ---------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------------- voice input ---------------- */

  const parseVoiceText = (text) => {
    const keywords = "किसान|फार्मर|फील्ड|खेत|वर्क टाइप|काम|मिनट|टाइम|डेट|तारीख";

    const pick = (starts) =>
      text.match(new RegExp(`(?:${starts})\\s+(.+?)(?=\\s*(?:${keywords}|$))`))?.[1]?.trim() || "";

    const minutesMatch =
      text.match(/(\d+)\s*(?:मिनट|टाइम)/) || text.match(/(?:मिनट|टाइम)\s*(\d+)/);

    // "कल" means both yesterday and tomorrow in Hindi. Work is recorded after it's
    // done, so it's treated as yesterday.
    let date;
    if (/आज/.test(text)) date = getLocalDate();
    else if (/कल/.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = getLocalDate(d);
    }

    return {
      farmerName: pick("किसान|फार्मर"),
      fieldName: pick("फील्ड|खेत"),
      workType: pick("वर्क टाइप|काम"),
      totalMinutes: minutesMatch?.[1] || "",
      date,
    };
  };

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const parsed = parseVoiceText(event.results[0][0].transcript);
      let captured = 0;
      const next = {};

      if (parsed.fieldName) {
        next.fieldName = parsed.fieldName;
        captured++;
      }
      if (parsed.totalMinutes) {
        next.totalMinutes = parsed.totalMinutes;
        captured++;
      }
      if (parsed.date) {
        next.date = parsed.date;
        captured++;
      }

      if (parsed.workType) {
        const spoken = parsed.workType.toLowerCase();
        const matchedRate = rates.find((rate) => {
          const type = String(rate.type || "").toLowerCase();
          return type && (type.includes(spoken) || spoken.includes(type));
        });
        if (matchedRate) {
          next.workType = matchedRate.type;
          captured++;
        }
      }

      if (parsed.farmerName) {
        const spoken = parsed.farmerName.toLowerCase();
        const matchedFarmer = farmers.find((f) => f.name?.toLowerCase().includes(spoken));
        if (matchedFarmer) {
          next.farmer = matchedFarmer._id;
          captured++;
        } else {
          toast.error(`Farmer "${parsed.farmerName}" not found`);
        }
      }

      if (captured > 0) {
        setForm((prev) => ({ ...prev, ...next }));
        toast.success("Voice details captured");
      } else {
        toast.error("Couldn't pick out any details. Try again.");
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      toast.error(
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

  /* ---------------- reset ---------------- */

  const resetWorkForm = () => {
    setCreatedWork(null);
    setPaymentCompleted(false);
    setPaymentResult(null);
    setPaymentForm({ amount: "", paymentMethod: "CASH", note: "" });

    // farmer + work type are kept: adding several works for one farmer is common
    setForm((prev) => ({
      ...prev,
      fieldName: "",
      totalMinutes: "",
      date: getLocalDate(),
    }));
  };

  /* ---------------- create work ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.farmer) return toast.error("Please select a farmer");
    if (!form.fieldName.trim()) return toast.error("Field name is required");
    if (!form.workType) return toast.error("Please select a work type");
    if (
      !form.totalMinutes ||
      !Number.isFinite(Number(form.totalMinutes)) ||
      Number(form.totalMinutes) <= 0
    ) {
      return toast.error("Enter valid work minutes");
    }
    if (!selectedRate) return toast.error(`No rate set for "${form.workType}"`);
    if (!form.date) return toast.error("Please select work date");

    try {
      setSubmitting(true);

      // Payment is deliberately recorded separately.
      const payload = {
        farmerId: form.farmer,
        fieldName: form.fieldName.trim(),
        workType: form.workType,
        workRate: selectedRate._id,
        startTime: buildStartTime(form.date),
        totalMinutes: Number(form.totalMinutes),
        paidAmount: 0,
        date: form.date,
      };

      const res = await axios.post(`${API}/work/add`, payload, { withCredentials: true });
      const work = res.data?.work || res.data?.data?.work;

      if (!work?._id) {
        toast.error(
          "Work may have been created, but its ID was not returned. Check the work records before retrying."
        );
        return;
      }

      setCreatedWork({
        ...work,
        farmerID: work.farmerID || form.farmer,
        totalAmount: Number(work.totalAmount ?? calculatedAmount),
      });

      setPaymentCompleted(false);
      setPaymentResult(null);

      // Default amount = remaining due AFTER the backend applied available advance
      const due = getWorkDue({ ...work, totalAmount: work.totalAmount ?? calculatedAmount });
      setPaymentForm({ amount: due > 0 ? String(due) : "", paymentMethod: "CASH", note: "" });

      toast.success(res.data?.message || "Work created successfully");
      refreshFarmers();
    } catch (err) {
      console.error("Add work failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to add work record");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- record payment ---------------- */

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (paymentSubmitting) return;

    if (!createdWork?._id) return toast.error("Work record not found");
    if (paymentCompleted) return toast.error("Payment has already been recorded");
    if (!validPayment) return toast.error("Enter a valid payment amount");

    // The payment endpoint requires driverID
    const driverID = createdWork.driverID || createdWork.createdBy;
    if (!driverID) {
      return toast.error("Driver ID is missing from the created work. Check the work/add response.");
    }

    try {
      setPaymentSubmitting(true);

      const res = await axios.post(
        `${API}/payment`,
        {
          driverID,
          workId: createdWork._id,
          amount: enteredPayment,
          paymentMethod: paymentForm.paymentMethod,
          note: paymentForm.note.trim(),
        },
        { withCredentials: true }
      );

      const summary = res.data?.summary || {};
      const updatedWork = res.data?.work;

      setCreatedWork((prev) => ({ ...prev, ...(updatedWork || {}), _id: prev._id }));

      setPaymentResult({
        amount: enteredPayment,
        appliedAmount: Number(summary.appliedAmount || 0),
        advanceAmount: Number(summary.advanceAmount || 0),
        remainingDue: Number(summary.remainingDue ?? updatedWork?.dueAmount ?? 0),
        remainingAdvance: Number(summary.remainingAdvance ?? 0),
        paymentStatus: summary.paymentStatus || "SUCCESS",
        paymentMethod: paymentForm.paymentMethod,
      });

      setPaymentCompleted(true);
      toast.success(res.data?.message || "Payment recorded successfully");
      refreshFarmers();
    } catch (err) {
      console.error("Payment failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /* ---------------- render ---------------- */

  const farmerPanel = selectedFarmer && (
    <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Selected farmer
          </p>
          <h3 className="mt-1 truncate text-lg font-extrabold text-stone-900">
            {selectedFarmer.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
            <MapPin size={12} />
            {selectedFarmer.village || "Village not available"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
          {farmerStatus} account
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <SummaryTile label="Billed" value={formatCurrency(farmerBilled)} icon={Receipt} tone="slate" />
        <SummaryTile label="Settled" value={formatCurrency(farmerPaid)} icon={CheckCircle2} tone="emerald" />
        <SummaryTile label="Due" value={formatCurrency(farmerDue)} icon={AlertCircle} tone="rose" />
        <SummaryTile label="Advance" value={formatCurrency(farmerAdvance)} icon={Wallet} tone="amber" />
      </div>

      {farmerAdvance > 0 && !createdWork && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <Wallet size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            <span className="font-bold">{formatCurrency(farmerAdvance)}</span> advance is
            available. The backend will apply it to this new work using its accounting logic.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[36px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Add Work Record</h1>
              <p className="mt-1 text-sm text-emerald-100/80">
                Create work and record payment immediately
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startListening}
            disabled={Boolean(createdWork)}
            aria-pressed={listening}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl shadow-black/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
              listening
                ? "animate-pulse bg-rose-500 text-white"
                : "bg-white text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {listening ? <FiMicOff size={18} /> : <IoMicOutline size={18} />}
            {listening ? "Listening..." : "Voice Input"}
          </button>
        </div>

        <div className="relative mt-6">
          <Stepper step={step} />
        </div>
      </header>

      {listening && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          <IoMicOutline size={19} className="animate-pulse" />
          Listening... Speak your work details in Hindi.
        </div>
      )}

      {/* States */}
      {loadingOptions ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="h-96 animate-pulse rounded-[2rem] bg-stone-200/70 lg:col-span-3" />
          <div className="h-96 animate-pulse rounded-[2rem] bg-stone-200/70 lg:col-span-2" />
        </div>
      ) : optionsError ? (
        <div className="rounded-[2rem] bg-white p-10 text-center shadow-lg ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={26} />
          </div>
          <p className="mt-4 font-bold text-stone-800">{optionsError}</p>
          <button
            onClick={loadOptions}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      ) : rates.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-12 text-center shadow-lg ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
            <Tractor size={30} />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-stone-900">No Work Rates Found</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
            Add at least one work rate in Settings before creating a work record.
          </p>
          <button
            onClick={() => navigate("/settings")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            Go to Settings
            <ArrowRight size={16} />
          </button>
        </div>
      ) : !createdWork ? (
        /* ================= STEP 1 ================= */
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 sm:p-8 lg:col-span-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Sprout size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-stone-900">Work Information</h2>
                <p className="text-xs text-stone-400">Enter farmer, field and work details</p>
              </div>
            </div>

            <Field label="Farmer" icon={UserRound}>
              <Select name="farmer" value={form.farmer} onChange={handleChange} required>
                <option value="">Select a farmer</option>
                {farmers.map((farmer) => (
                  <option key={farmer._id} value={farmer._id}>
                    {farmer.name}
                    {farmer.village ? ` (${farmer.village})` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Field name" icon={Hash}>
                <input
                  name="fieldName"
                  value={form.fieldName}
                  onChange={handleChange}
                  placeholder="Enter field name"
                  required
                  className={fieldCls}
                />
              </Field>

              <Field label="Work type" icon={Tractor}>
                <Select name="workType" value={form.workType} onChange={handleChange} required>
                  <option value="">Select work type</option>
                  {rates.map((rate) => (
                    <option key={rate._id || rate.type} value={rate.type}>
                      {rate.type}
                      {rate.rate ? ` — ${formatCurrency(rate.rate)}/hr` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Total minutes" icon={Clock3}>
                <input
                  name="totalMinutes"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.totalMinutes}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 120"
                  required
                  className={fieldCls}
                />
              </Field>

              <Field label="Work date" icon={CalendarDays}>
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className={fieldCls}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-400">Verify farmer and work details before saving.</p>

              <button
                type="submit"
                disabled={submitting || !selectedFarmer}
                className="inline-flex min-w-52 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Creating Work...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    Create Work Record
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Side: farmer + amount preview */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-2">
            {farmerPanel || (
              <div className="rounded-[2rem] border-2 border-dashed border-stone-200 bg-white/60 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
                  <UserRound size={26} />
                </div>
                <p className="mt-3 text-sm font-bold text-stone-600">No farmer selected</p>
                <p className="mt-1 text-xs text-stone-400">
                  Choose a farmer to see their account summary.
                </p>
              </div>
            )}

            <div className="rounded-[2rem] bg-gradient-to-br from-emerald-600 to-emerald-500 p-6 text-white shadow-lg shadow-emerald-600/25">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Calculator size={17} />
                Work Amount Preview
              </div>
              <p className="mt-4 text-4xl font-extrabold tabular-nums tracking-tight">
                {formatCurrency(calculatedAmount)}
              </p>
              <p className="mt-1 text-xs text-emerald-50/90">
                {ratePerHour > 0 && Number(form.totalMinutes) > 0
                  ? `(${Number(form.totalMinutes)} ÷ 60) × ${formatCurrency(ratePerHour)}/hr, rounded up`
                  : "Select a work type and enter minutes"}
              </p>

              <p className="mt-4 rounded-xl bg-white/15 p-3 text-xs leading-relaxed">
                Available farmer advance is handled by the backend. Any direct payment is
                recorded separately after the work is created.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        /* ================= STEP 2 ================= */
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            {/* Created banner */}
            <div className="flex items-start gap-3 rounded-[2rem] bg-emerald-50 p-5 ring-1 ring-emerald-200">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={23} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-emerald-900">
                  Work Created Successfully!
                </h2>
                <p className="mt-0.5 text-sm text-emerald-700">
                  {createdWork.workType || form.workType} •{" "}
                  {createdWork.fieldName || form.fieldName}
                </p>
                <p className="mt-0.5 truncate text-xs text-emerald-600">
                  Work ID: {createdWork._id}
                </p>
              </div>
            </div>

            {paymentCompleted ? (
              <section className="overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-stone-900/5 ring-1 ring-emerald-200">
                <div className="flex items-center gap-3 bg-emerald-600 p-5 text-white">
                  <CheckCircle2 size={26} />
                  <div>
                    <h3 className="text-lg font-extrabold">Payment Recorded!</h3>
                    <p className="text-xs text-emerald-100">Payment successfully submitted</p>
                  </div>
                </div>

                <div className="space-y-3 p-6">
                  <ResultRow
                    label="Received amount"
                    value={formatCurrency(paymentResult?.amount)}
                    valueCls="text-emerald-700"
                    strong
                  />
                  <ResultRow label="Applied to work" value={formatCurrency(paymentResult?.appliedAmount)} />
                  {paymentResult?.advanceAmount > 0 && (
                    <ResultRow
                      label="Added to farmer advance"
                      value={formatCurrency(paymentResult.advanceAmount)}
                      valueCls="text-amber-700"
                    />
                  )}
                  <div className="border-t border-stone-100 pt-3">
                    <ResultRow
                      label="Remaining due"
                      value={formatCurrency(paymentResult?.remainingDue)}
                      valueCls="text-rose-600"
                      strong
                    />
                  </div>
                  <ResultRow label="Payment method" value={paymentResult?.paymentMethod} />
                  <ResultRow
                    label="Farmer available advance"
                    value={formatCurrency(paymentResult?.remainingAdvance)}
                    valueCls="text-amber-700"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/70 p-5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/payments")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100"
                  >
                    <Receipt size={16} />
                    View Payments
                  </button>
                  <button
                    type="button"
                    onClick={resetWorkForm}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
                  >
                    <Tractor size={16} />
                    Add Another Work
                  </button>
                </div>
              </section>
            ) : workDue <= 0 ? (
              <section className="rounded-[2rem] bg-white p-8 text-center shadow-lg shadow-stone-900/5 ring-1 ring-emerald-200">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-stone-900">Work Fully Settled</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                  Available farmer advance has covered this work. No additional payment is
                  required.
                </p>
                <button
                  type="button"
                  onClick={resetWorkForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
                >
                  <Tractor size={16} />
                  Add Another Work
                </button>
              </section>
            ) : (
              <form
                onSubmit={handlePaymentSubmit}
                className="space-y-5 rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-stone-900">Receive Payment Now</h3>
                    <p className="text-xs text-stone-400">
                      Record a direct payment against this new work
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
                    Outstanding amount
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-rose-700">
                    {formatCurrency(workDue)}
                  </p>
                  {workAdvance > 0 && (
                    <p className="mt-1 text-xs text-rose-600">
                      After advance adjustment of {formatCurrency(workAdvance)}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="pay-amount" className={labelCls}>
                    Payment amount
                  </label>
                  <div className="relative">
                    <IndianRupee
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      id="pay-amount"
                      type="number"
                      name="amount"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={paymentForm.amount}
                      onChange={handlePaymentChange}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0.00"
                      required
                      className={`${fieldCls} py-4 text-xl font-extrabold tabular-nums`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentForm((p) => ({ ...p, amount: String(workDue) }))}
                      className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Pay full due
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm((p) => ({ ...p, amount: String(Math.ceil(workDue / 2)) }))
                      }
                      className="rounded-full bg-stone-100 px-3.5 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-200"
                    >
                      Pay half
                    </button>
                  </div>
                </div>

                <div>
                  <span className={labelCls}>Payment method</span>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
                      const active = paymentForm.paymentMethod === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPaymentForm((p) => ({ ...p, paymentMethod: id }))}
                          aria-pressed={active}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-bold transition ${
                            active
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                              : "bg-stone-50 text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          <Icon size={18} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="pay-note" className={labelCls}>
                    Note (optional)
                  </label>
                  <textarea
                    id="pay-note"
                    name="note"
                    value={paymentForm.note}
                    onChange={handlePaymentChange}
                    rows={2}
                    placeholder="Enter payment note..."
                    className={`${fieldCls} resize-none pl-4`}
                  />
                </div>

                <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-100">
                  <ResultRow label="Payment entered" value={formatCurrency(validPayment ? enteredPayment : 0)} />
                  <div className="mt-2">
                    <ResultRow label="Due before payment" value={formatCurrency(workDue)} />
                  </div>
                  <div className="mt-3 border-t border-stone-200 pt-3">
                    {paymentExcess > 0 ? (
                      <div className="flex items-start gap-2 text-xs leading-relaxed text-amber-700">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>
                          Payment exceeds this work&apos;s due by {formatCurrency(paymentExcess)}.
                          The backend may allocate the excess as farmer advance.
                        </span>
                      </div>
                    ) : (
                      <ResultRow
                        label="Estimated remaining due"
                        value={formatCurrency(paymentRemaining)}
                        valueCls="text-rose-600"
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={paymentSubmitting || !validPayment}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {paymentSubmitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Recording Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Record Payment{validPayment ? ` • ${formatCurrency(enteredPayment)}` : ""}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetWorkForm}
                    disabled={paymentSubmitting}
                    className="rounded-2xl bg-stone-100 px-5 py-4 text-sm font-bold text-stone-600 transition hover:bg-stone-200 disabled:opacity-50"
                  >
                    Skip, pay later
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Side: work summary + farmer */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-2">
            <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-800">
                <Receipt size={16} className="text-emerald-600" />
                Work Financial Summary
              </h3>
              <p className="mt-0.5 text-xs text-stone-400">
                Advance adjustment and outstanding amount
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="col-span-2">
                  <SummaryTile label="Work amount" value={formatCurrency(workTotal)} icon={IndianRupee} tone="slate" />
                </div>
                <SummaryTile label="Advance applied" value={formatCurrency(workAdvance)} icon={Wallet} tone="amber" />
                <SummaryTile
                  label="Remaining due"
                  value={formatCurrency(paymentCompleted ? paymentResult?.remainingDue : workDue)}
                  icon={AlertCircle}
                  tone="rose"
                />
              </div>
            </div>

            {farmerPanel}
          </aside>
        </div>
      )}

      <p className="text-center text-xs text-stone-400">
        Work and payment are stored separately to maintain accurate accounting.
      </p>
    </div>
  );
}