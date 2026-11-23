
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sprout,
  Calculator,
  Banknote,
  RefreshCw,
  Receipt,
  XCircle,
} from "lucide-react";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Field from "../../components/UI/Field";
import PrimaryButton from "../../components/UI/PrimaryButton";

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

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

function getWorkAdvance(work) {
  return Math.max(
    0,
    Number(work?.advanceAppliedAmount || 0)
  );
}

/* --------------------------------------------------
   SMALL COMPONENTS
-------------------------------------------------- */

function SummaryTile({ label, value, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-800",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-75">
        <Icon size={15} />
        {label}
      </div>

      <p className="mt-2 break-words text-xl font-bold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <Icon size={19} />
      </div>

      <div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------
   MAIN PAGE
-------------------------------------------------- */

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

  const [form, setForm] = useState({
    farmer: "",
    fieldName: "",
    workType: "",
    totalMinutes: "",
    date: getLocalDate(),
  });

  // Newly created work record.
  const [createdWork, setCreatedWork] = useState(null);

  // Payment form appears after work creation.
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    note: "",
  });

  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  /* --------------------------------------------------
     LOAD FARMERS AND RATES
  -------------------------------------------------- */

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      setOptionsError(null);

      const [farmersRes, ratesRes] = await Promise.all([
        axios.post(
          `${API}/farmer/all-farmer`,
          {},
          { withCredentials: true }
        ),

        axios.get(`${API}/rate/rates`, {
          withCredentials: true,
        }),
      ]);

      const farmerList =
        farmersRes.data?.all ||
        farmersRes.data?.farmers ||
        [];

      const rateList = ratesRes.data?.rates || [];

      setFarmers(farmerList);
      setRates(rateList);

      setForm((prev) => ({
        ...prev,
        farmer: prev.farmer || farmerList[0]?._id || "",
        workType: prev.workType || rateList[0]?.type || "",
      }));
    } catch (err) {
      console.error(
        "Failed to load options:",
        err.response?.data || err.message
      );

      setOptionsError("Couldn't load farmers or work rates.");
      toast.error("Failed to load farmers or work rates");
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  /* --------------------------------------------------
     SELECTED FARMER
  -------------------------------------------------- */

  const selectedFarmer = useMemo(
    () =>
      farmers.find(
        (farmer) => farmer._id === form.farmer
      ) || null,
    [farmers, form.farmer]
  );

  const farmerBilled = Number(
    selectedFarmer?.totalBilledAmount || 0
  );

  const farmerPaid = Number(
    selectedFarmer?.totalPaidAmount || 0
  );

  const farmerDue = Number(
    selectedFarmer?.totalDueAmount || 0
  );

  const farmerAdvance = Number(
    selectedFarmer?.advanceAmount || 0
  );

  const farmerStatus =
    farmerDue > 0
      ? farmerPaid > 0
        ? "Partial"
        : "Due"
      : farmerAdvance > 0
        ? "Advance"
        : "Paid";

  /* --------------------------------------------------
     WORK CALCULATION
  -------------------------------------------------- */

  const selectedRate = useMemo(
    () =>
      rates.find(
        (rate) => rate.type === form.workType
      ) || null,
    [rates, form.workType]
  );

  const ratePerHour = Number(selectedRate?.rate || 0);

  const calculatedAmount = useMemo(() => {
    const minutes = Number(form.totalMinutes || 0);

    if (minutes <= 0 || ratePerHour <= 0) {
      return 0;
    }

    return Math.ceil((minutes / 60) * ratePerHour);
  }, [form.totalMinutes, ratePerHour]);

  /* --------------------------------------------------
     CREATED WORK / PAYMENT CALCULATION
  -------------------------------------------------- */

  const workDue = getWorkDue(createdWork);

  const workTotal = Number(
    createdWork?.totalAmount || calculatedAmount || 0
  );

  const workAdvance = getWorkAdvance(createdWork);

  const enteredPayment = Number(paymentForm.amount || 0);

  const paymentRemaining = Math.max(
    0,
    workDue - enteredPayment
  );

  const paymentExcess = Math.max(
    0,
    enteredPayment - workDue
  );

  /* --------------------------------------------------
     FORM HANDLERS
  -------------------------------------------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* --------------------------------------------------
     VOICE INPUT
  -------------------------------------------------- */

  const parseVoiceText = (text) => {
    const keywords =
      "किसान|फार्मर|फील्ड|खेत|वर्क टाइप|काम|मिनट|टाइम|डेट|तारीख";

    const farmerMatch = text.match(
      new RegExp(
        `(?:किसान|फार्मर)\\s+(.+?)(?=\\s*(?:${keywords}|$))`
      )
    );

    const fieldMatch = text.match(
      new RegExp(
        `(?:फील्ड|खेत)\\s+(.+?)(?=\\s*(?:${keywords}|$))`
      )
    );

    const workTypeMatch = text.match(
      new RegExp(
        `(?:वर्क टाइप|काम)\\s+(.+?)(?=\\s*(?:${keywords}|$))`
      )
    );

    const minutesMatch =
      text.match(/(\d+)\s*(?:मिनट|टाइम)/) ||
      text.match(/(?:मिनट|टाइम)\s*(\d+)/);

    const isToday = /आज/.test(text);
    const isTomorrow = /कल/.test(text);

    let date;

    if (isToday) {
      date = getLocalDate();
    }

    if (isTomorrow) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = getLocalDate(tomorrow);
    }

    return {
      farmerName: farmerMatch?.[1]?.trim() || "",
      fieldName: fieldMatch?.[1]?.trim() || "",
      workType: workTypeMatch?.[1]?.trim() || "",
      totalMinutes: minutesMatch?.[1] || "",
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
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        "Speech recognition is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      const parsed = parseVoiceText(spokenText);

      setForm((prev) => {
        const next = { ...prev };

        if (parsed.fieldName) {
          next.fieldName = parsed.fieldName;
        }

        if (parsed.totalMinutes) {
          next.totalMinutes = parsed.totalMinutes;
        }

        if (parsed.date) {
          next.date = parsed.date;
        }

        if (parsed.workType) {
          const matchedRate = rates.find((rate) => {
            const rateType = rate.type.toLowerCase();
            const spoken = parsed.workType.toLowerCase();

            return (
              rateType.includes(spoken) ||
              spoken.includes(rateType)
            );
          });

          if (matchedRate) {
            next.workType = matchedRate.type;
          }
        }

        return next;
      });

      if (parsed.farmerName) {
        const matchedFarmer = farmers.find((farmer) =>
          farmer.name
            ?.toLowerCase()
            .includes(parsed.farmerName.toLowerCase())
        );

        if (matchedFarmer) {
          setForm((prev) => ({
            ...prev,
            farmer: matchedFarmer._id,
          }));
        } else {
          toast.error(
            `Farmer "${parsed.farmerName}" not found`
          );
        }
      }

      toast.success("Voice details captured");
    };

    recognition.onerror = () => {
      setListening(false);
      toast.error("Couldn't catch that. Try again.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    setListening(true);
    recognition.start();
  };

  /* --------------------------------------------------
     RESET AFTER WORK
  -------------------------------------------------- */

  const resetWorkForm = () => {
    setCreatedWork(null);
    setPaymentCompleted(false);
    setPaymentResult(null);

    setPaymentForm({
      amount: "",
      paymentMethod: "CASH",
      note: "",
    });

    setForm((prev) => ({
      ...prev,
      fieldName: "",
      totalMinutes: "",
      date: getLocalDate(),
    }));
  };

  /* --------------------------------------------------
     CREATE WORK
  -------------------------------------------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.farmer) {
      return toast.error("Please select a farmer");
    }

    if (!form.fieldName.trim()) {
      return toast.error("Field name is required");
    }

    if (!form.workType) {
      return toast.error("Please select a work type");
    }

    if (
      !form.totalMinutes ||
      !Number.isFinite(Number(form.totalMinutes)) ||
      Number(form.totalMinutes) <= 0
    ) {
      return toast.error("Enter valid work minutes");
    }

    if (!selectedRate) {
      return toast.error(
        `No rate set for "${form.workType}"`
      );
    }

    if (!form.date) {
      return toast.error("Please select work date");
    }

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

      const res = await axios.post(
        `${API}/work/add`,
        payload,
        { withCredentials: true }
      );

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
        totalAmount: Number(
          work.totalAmount ?? calculatedAmount
        ),
      });

      setPaymentCompleted(false);
      setPaymentResult(null);

      // Default payment amount is the remaining due
      // AFTER backend has applied available farmer advance.
      const due = getWorkDue({
        ...work,
        totalAmount: work.totalAmount ?? calculatedAmount,
      });

      setPaymentForm({
        amount: due > 0 ? String(due) : "",
        paymentMethod: "CASH",
        note: "",
      });

      toast.success(
        res.data?.message || "Work created successfully"
      );

      // Refresh farmer data to reflect advance/due changes.
      try {
        const farmersRes = await axios.post(
          `${API}/farmer/all-farmer`,
          {},
          { withCredentials: true }
        );

        const updatedFarmers =
          farmersRes.data?.all ||
          farmersRes.data?.farmers ||
          [];

        setFarmers(updatedFarmers);
      } catch (refreshError) {
        console.error("Farmer refresh failed:", refreshError);
      }
    } catch (err) {
      console.error(
        "Add work failed:",
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message ||
          "Failed to add work record"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------
     RECORD PAYMENT FOR JUST CREATED WORK
  -------------------------------------------------- */

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!createdWork?._id) {
      return toast.error("Work record not found");
    }

    if (paymentCompleted) {
      return toast.error("Payment has already been recorded");
    }

    if (!Number.isFinite(enteredPayment) || enteredPayment <= 0) {
      return toast.error("Enter a valid payment amount");
    }

    // The payment endpoint requires driverID.
    const driverID =
      createdWork.driverID ||
      createdWork.createdBy;

    if (!driverID) {
      return toast.error(
        "Driver ID is missing from the created work. Check the work/add response."
      );
    }

    try {
      setPaymentSubmitting(true);

      const payload = {
        driverID,
        workId: createdWork._id,
        amount: enteredPayment,
        paymentMethod: paymentForm.paymentMethod,
        note: paymentForm.note.trim(),
      };

      const res = await axios.post(
        `${API}/payment`,
        payload,
        { withCredentials: true }
      );

      const summary = res.data?.summary || {};
      const updatedWork = res.data?.work;

      setCreatedWork((prev) => ({
        ...prev,
        ...(updatedWork || {}),
        _id: prev._id,
      }));

      setPaymentResult({
        amount: enteredPayment,
        appliedAmount: Number(summary.appliedAmount || 0),
        advanceAmount: Number(summary.advanceAmount || 0),
        remainingDue: Number(
          summary.remainingDue ??
          updatedWork?.dueAmount ??
          0
        ),
        remainingAdvance: Number(
          summary.remainingAdvance ?? 0
        ),
        paymentStatus: summary.paymentStatus || "SUCCESS",
        paymentMethod: paymentForm.paymentMethod,
      });

      setPaymentCompleted(true);

      toast.success(
        res.data?.message || "Payment recorded successfully"
      );

      // Refresh farmer summary.
      try {
        const farmersRes = await axios.post(
          `${API}/farmer/all-farmer`,
          {},
          { withCredentials: true }
        );

        const updatedFarmers =
          farmersRes.data?.all ||
          farmersRes.data?.farmers ||
          [];

        setFarmers(updatedFarmers);
      } catch (refreshError) {
        console.error("Farmer refresh failed:", refreshError);
      }
    } catch (err) {
      console.error(
        "Payment failed:",
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message ||
          "Failed to record payment"
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <PageHeader
            title="Add Work Record"
            subtitle="Create work and record payment immediately"
            action={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={startListening}
                  disabled={!!createdWork}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                    listening
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {listening ? (
                    <FiMicOff size={18} />
                  ) : (
                    <IoMicOutline size={18} />
                  )}

                  {listening ? "Listening..." : "Voice Input"}
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

        {/* VOICE STATUS */}

        {listening && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <IoMicOutline size={19} className="animate-pulse" />
            Listening... Speak your work details in Hindi.
          </div>
        )}

        <Card className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-0 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">

          {loadingOptions ? (
            <div className="space-y-5 p-6">
              <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-100" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            </div>
          ) : optionsError ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />

              <p className="text-sm text-red-500">
                {optionsError}
              </p>

              <button
                onClick={loadOptions}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                <RefreshCw size={15} className="mr-2 inline" />
                Retry
              </button>
            </div>
          ) : rates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Tractor className="h-12 w-12 text-slate-300" />

              <h3 className="text-lg font-semibold text-slate-800">
                No Work Rates Found
              </h3>

              <p className="max-w-sm text-sm text-slate-500">
                Add at least one work rate in Settings before creating a work record.
              </p>

              <PrimaryButton
                onClick={() => navigate("/settings")}
              >
                Go to Settings
              </PrimaryButton>
            </div>
          ) : (
            <>
              {/* WORK FORM */}

              {!createdWork && (
                <form onSubmit={handleSubmit}>
                  <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-6 py-5">
                    <SectionHeading
                      icon={Sprout}
                      title="Work Information"
                      subtitle="Enter farmer, field and work details"
                    />
                  </div>

                  <div className="space-y-7 p-5 sm:p-7">

                    {/* FARMER */}

                    <section>
                      <SectionHeading
                        icon={UserRound}
                        title="Farmer Details"
                      />

                      <Field label="Select Farmer">
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <select
                            name="farmer"
                            value={form.farmer}
                            onChange={handleChange}
                            required
                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          >
                            <option value="">
                              Select farmer
                            </option>

                            {farmers.map((farmer) => (
                              <option
                                key={farmer._id}
                                value={farmer._id}
                              >
                                {farmer.name}
                                {farmer.village
                                  ? ` (${farmer.village})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Field>

                      {selectedFarmer && (
                        <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                Selected Farmer
                              </p>

                              <h3 className="mt-1 text-lg font-bold text-slate-900">
                                {selectedFarmer.name}
                              </h3>

                              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <MapPin size={12} />
                                {selectedFarmer.village || "Village not available"}
                              </p>
                            </div>

                            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                              {farmerStatus} Account
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                            <SummaryTile
                              label="Total Billed"
                              value={formatCurrency(farmerBilled)}
                              icon={Receipt}
                              tone="slate"
                            />

                            <SummaryTile
                              label="Total Settled"
                              value={formatCurrency(farmerPaid)}
                              icon={CheckCircle2}
                              tone="emerald"
                            />

                            <SummaryTile
                              label="Remaining Due"
                              value={formatCurrency(farmerDue)}
                              icon={AlertCircle}
                              tone="rose"
                            />

                            <SummaryTile
                              label="Available Advance"
                              value={formatCurrency(farmerAdvance)}
                              icon={Wallet}
                              tone="amber"
                            />
                          </div>

                          {farmerAdvance > 0 && (
                            <div className="mx-4 mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
                              <Wallet
                                size={17}
                                className="mt-0.5 shrink-0 text-amber-600"
                              />

                              <div>
                                <p className="text-sm font-semibold text-amber-800">
                                  Advance Available
                                </p>

                                <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                                  {formatCurrency(farmerAdvance)} existing advance is available.
                                  Backend FIFO accounting will apply it to the new work according to your work accounting logic.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>

                    {/* WORK DETAILS */}

                    <section>
                      <SectionHeading
                        icon={Tractor}
                        title="Work Details"
                      />

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Field Name">
                          <div className="relative">
                            <Hash className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                              name="fieldName"
                              value={form.fieldName}
                              onChange={handleChange}
                              placeholder="Enter field name"
                              required
                              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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
                              required
                              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                            >
                              <option value="">
                                Select work type
                              </option>

                              {rates.map((rate) => (
                                <option
                                  key={rate._id || rate.type}
                                  value={rate.type}
                                >
                                  {rate.type}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Field>

                        <Field label="Rate Per Hour">
                          <div className="relative">
                            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                              value={
                                ratePerHour
                                  ? formatCurrency(ratePerHour)
                                  : "Not set"
                              }
                              readOnly
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3.5 text-sm font-semibold text-slate-600 outline-none"
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
                              step="1"
                              value={form.totalMinutes}
                              onChange={handleChange}
                              placeholder="e.g. 120"
                              required
                              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                            />
                          </div>
                        </Field>

                        <Field label="Work Date">
                          <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                              name="date"
                              type="date"
                              value={form.date}
                              onChange={handleChange}
                              required
                              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                            />
                          </div>
                        </Field>
                      </div>
                    </section>

                    {/* WORK PREVIEW */}

                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4">
                        <Calculator
                          size={18}
                          className="text-emerald-600"
                        />

                        <div>
                          <h3 className="font-semibold text-slate-800">
                            Work Amount Preview
                          </h3>

                          <p className="text-xs text-slate-500">
                            Calculated using rate and duration
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                        <SummaryTile
                          label="Rate Per Hour"
                          value={formatCurrency(ratePerHour)}
                          icon={IndianRupee}
                          tone="slate"
                        />

                        <SummaryTile
                          label="Estimated Work Amount"
                          value={formatCurrency(calculatedAmount)}
                          icon={Calculator}
                          tone="emerald"
                        />
                      </div>

                      <div className="px-5 pb-5">
                        <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
                          Available farmer advance will be handled by the backend accounting system. Any direct payment will be recorded separately after the work is created.
                        </p>
                      </div>
                    </section>

                    {/* SAVE WORK */}

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-400">
                        Verify farmer and work details before saving.
                      </p>

                      <PrimaryButton
                        type="submit"
                        disabled={submitting || !selectedFarmer}
                        className="flex min-w-48 items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {submitting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Creating Work...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={17} />
                            Create Work Record
                          </>
                        )}
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              )}

              {/* --------------------------------------------------
                  AFTER WORK CREATION: PAYMENT SECTION
              -------------------------------------------------- */}

              {createdWork && (
                <div className="space-y-6 p-5 sm:p-7">

                  {/* SUCCESS HEADER */}

                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={23} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-emerald-900">
                          Work Created Successfully!
                        </h2>

                        <p className="mt-1 text-sm text-emerald-700">
                          {createdWork.workType || form.workType}
                          {" "} • {createdWork.fieldName || form.fieldName}
                        </p>

                        <p className="mt-1 text-xs text-emerald-600">
                          Work ID: {createdWork._id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* WORK FINANCIAL SUMMARY */}

                  <section>
                    <SectionHeading
                      icon={Receipt}
                      title="Work Financial Summary"
                      subtitle="Advance adjustment and outstanding amount"
                    />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <SummaryTile
                        label="Work Amount"
                        value={formatCurrency(workTotal)}
                        icon={IndianRupee}
                        tone="slate"
                      />

                      <SummaryTile
                        label="Advance Applied"
                        value={formatCurrency(workAdvance)}
                        icon={Wallet}
                        tone="amber"
                      />

                      <SummaryTile
                        label="Remaining Due"
                        value={formatCurrency(
                          paymentCompleted
                            ? paymentResult?.remainingDue
                            : workDue
                        )}
                        icon={AlertCircle}
                        tone="rose"
                      />
                    </div>
                  </section>

                  {/* PAYMENT FORM OR SUCCESS */}

                  {paymentCompleted ? (
                    <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white">
                      <div className="bg-emerald-600 p-5 text-white">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={25} />

                          <div>
                            <h3 className="text-lg font-bold">
                              Payment Recorded!
                            </h3>

                            <p className="text-xs text-emerald-100">
                              Payment successfully submitted
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-500">
                            Received amount
                          </span>

                          <strong className="text-lg text-emerald-700">
                            {formatCurrency(paymentResult?.amount)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-500">
                            Applied to work
                          </span>

                          <strong className="text-slate-800">
                            {formatCurrency(paymentResult?.appliedAmount)}
                          </strong>
                        </div>

                        {paymentResult?.advanceAmount > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-500">
                              Added to farmer advance
                            </span>

                            <strong className="text-amber-700">
                              {formatCurrency(paymentResult.advanceAmount)}
                            </strong>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="text-sm font-medium text-slate-600">
                            Remaining due
                          </span>

                          <strong className="text-lg text-rose-600">
                            {formatCurrency(paymentResult?.remainingDue)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-500">
                            Payment method
                          </span>

                          <strong className="text-slate-800">
                            {paymentResult?.paymentMethod}
                          </strong>
                        </div>

                        {paymentResult?.remainingAdvance !== undefined && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-500">
                              Farmer available advance
                            </span>

                            <strong className="text-amber-700">
                              {formatCurrency(paymentResult.remainingAdvance)}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => navigate("/payments")}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Receipt size={16} />
                          View Payments
                        </button>

                        <button
                          type="button"
                          onClick={resetWorkForm}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          <Tractor size={16} />
                          Add Another Work
                        </button>
                      </div>
                    </section>
                  ) : workDue <= 0 ? (
                    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />

                      <h3 className="mt-3 text-lg font-bold text-emerald-900">
                        Work Fully Settled
                      </h3>

                      <p className="mt-1 text-sm text-emerald-700">
                        Available farmer advance has covered this work. No additional payment is required.
                      </p>

                      <button
                        type="button"
                        onClick={resetWorkForm}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        <Tractor size={16} />
                        Add Another Work
                      </button>
                    </section>
                  ) : (
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
                        <SectionHeading
                          icon={CreditCard}
                          title="Receive Payment Now"
                          subtitle="Record a direct payment against this newly created work"
                        />
                      </div>

                      <form
                        onSubmit={handlePaymentSubmit}
                        className="space-y-5 p-5"
                      >
                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                            Outstanding Amount
                          </p>

                          <p className="mt-1 text-3xl font-extrabold text-rose-700">
                            {formatCurrency(workDue)}
                          </p>

                          {workAdvance > 0 && (
                            <p className="mt-1 text-xs text-rose-600">
                              After advance adjustment of {formatCurrency(workAdvance)}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <Field label="Payment Amount">
                            <div className="relative">
                              <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                              <input
                                type="number"
                                name="amount"
                                min="0.01"
                                step="0.01"
                                value={paymentForm.amount}
                                onChange={handlePaymentChange}
                                placeholder="Enter amount"
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </div>
                          </Field>

                          <Field label="Payment Method">
                            <div className="relative">
                              <CreditCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                              <select
                                name="paymentMethod"
                                value={paymentForm.paymentMethod}
                                onChange={handlePaymentChange}
                                required
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              >
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">Card</option>
                                <option value="BANK">Bank Transfer</option>
                              </select>
                            </div>
                          </Field>
                        </div>

                        <Field label="Payment Note (Optional)">
                          <textarea
                            name="note"
                            value={paymentForm.note}
                            onChange={handlePaymentChange}
                            rows={3}
                            placeholder="Enter payment note..."
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </Field>

                        {/* PAYMENT PREVIEW */}

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-500">
                              Payment entered
                            </span>

                            <strong className="text-slate-900">
                              {formatCurrency(enteredPayment)}
                            </strong>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-500">
                              Due before payment
                            </span>

                            <strong className="text-slate-900">
                              {formatCurrency(workDue)}
                            </strong>
                          </div>

                          <div className="mt-3 border-t border-slate-200 pt-3">
                            {paymentExcess > 0 ? (
                              <div className="flex items-start gap-2 text-xs text-amber-700">
                                <AlertCircle size={16} className="shrink-0" />

                                <span>
                                  Payment exceeds this work's due by {formatCurrency(paymentExcess)}. The backend may allocate the excess as farmer advance according to your payment controller.
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-500">
                                  Estimated remaining due
                                </span>

                                <strong className="text-rose-600">
                                  {formatCurrency(paymentRemaining)}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            paymentSubmitting ||
                            enteredPayment <= 0
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {paymentSubmitting ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Recording Payment...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} />
                              Record Payment
                              {enteredPayment > 0
                                ? ` • ${formatCurrency(enteredPayment)}`
                                : ""}
                            </>
                          )}
                        </button>

                        <p className="text-center text-xs text-slate-400">
                          Payment will be saved against this work record.
                        </p>
                      </form>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </Card>

        <p className="mt-5 text-center text-xs text-slate-400">
          Work and payment are stored separately to maintain accurate accounting.
        </p>
      </div>
    </div>
  );
}
