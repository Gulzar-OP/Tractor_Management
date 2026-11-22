
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
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sprout,
  Calculator,
  Mic,
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
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

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

  // --------------------------------------------------
  // LOAD FARMERS AND WORK RATES
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
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

        if (cancelled) return;

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
          "Failed to load farmers/rates:",
          err.response?.data || err.message
        );

        if (!cancelled) {
          setOptionsError(
            "Couldn't load farmers or work rates."
          );

          toast.error("Failed to load farmers or work rates");
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stop voice recognition when component unmounts
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // --------------------------------------------------
  // SELECTED FARMER
  // --------------------------------------------------

  const selectedFarmer = useMemo(
    () =>
      farmers.find(
        (farmer) => farmer._id === form.farmer
      ) || null,
    [farmers, form.farmer]
  );

  // Farmer's existing financial information
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

  // --------------------------------------------------
  // WORK RATE CALCULATION
  // --------------------------------------------------

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

  const enteredPaidAmount = Number(form.paidAmount || 0);

  const dueAmount = Math.max(
    calculatedAmount - enteredPaidAmount,
    0
  );

  const extraPayment = Math.max(
    enteredPaidAmount - calculatedAmount,
    0
  );

  const paidRatio =
    calculatedAmount > 0
      ? Math.min(enteredPaidAmount / calculatedAmount, 1)
      : 0;

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // VOICE INPUT
  // --------------------------------------------------

  const parseVoiceText = (text) => {
    const KEYWORDS =
      "किसान|फार्मर|फील्ड|खेत|वर्क टाइप|काम|मिनट|टाइम|पेड|भुगतान|पेमेंट|डेट|तारीख";

    const farmerMatch = text.match(
      new RegExp(
        `(?:किसान|फार्मर)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`
      )
    );

    const fieldMatch = text.match(
      new RegExp(
        `(?:फील्ड|खेत)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`
      )
    );

    const workTypeMatch = text.match(
      new RegExp(
        `(?:वर्क टाइप|काम)\\s+(.+?)(?=\\s*(?:${KEYWORDS}|$))`
      )
    );

    const minutesMatch =
      text.match(/(\d+)\s*(?:मिनट|टाइम)/) ||
      text.match(/(?:मिनट|टाइम)\s*(\d+)/);

    const paidMatch =
      text.match(
        /(\d+)\s*(?:रुपये|रुपए)?\s*(?:पेड|भुगतान|पेमेंट)/
      ) ||
      text.match(/(?:पेड|भुगतान|पेमेंट)\s*(\d+)/);

    const isToday = /आज/.test(text);
    const isTomorrow = /कल/.test(text);

    let date;

    if (isToday) {
      date = new Date().toISOString().slice(0, 10);
    }

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

        if (parsed.paidAmount) {
          next.paidAmount = parsed.paidAmount;
        }

        if (parsed.date) {
          next.date = parsed.date;
        }

        if (parsed.workType) {
          const matchedRate = rates.find(
            (rate) =>
              rate.type.toLowerCase().includes(
                parsed.workType.toLowerCase()
              ) ||
              parsed.workType
                .toLowerCase()
                .includes(rate.type.toLowerCase())
          );

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
            `Farmer "${parsed.farmerName}" not found in list`
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

  // --------------------------------------------------
  // SUBMIT WORK
  // --------------------------------------------------

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
      Number(form.totalMinutes) <= 0
    ) {
      return toast.error("Total minutes is required");
    }

    if (!selectedRate) {
      return toast.error(
        `No rate set for "${form.workType}" — add one in Settings first`
      );
    }

    if (enteredPaidAmount < 0) {
      return toast.error("Paid amount cannot be negative");
    }

    try {
      setSubmitting(true);

      // Keep the existing backend API contract unchanged.
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

      const res = await axios.post(
        `${API}/work/add`,
        payload,
        { withCredentials: true }
      );

      toast.success(
        res.data?.message ||
          "Work record added successfully"
      );

      setForm((prev) => ({
        ...prev,
        fieldName: "",
        workType: rates[0]?.type || "",
        totalMinutes: "",
        paidAmount: "",
        date: new Date().toISOString().slice(0, 10),
      }));

      // Refresh farmer information so the latest advance/due
      // is visible when the same farmer is selected again.
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

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <PageHeader
            title="Add Work Record"
            subtitle="Create a new tractor work entry and manage payment details"
            action={
              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={startListening}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                    listening
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
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
            <Mic size={18} className="animate-pulse" />
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
                onClick={() => window.location.reload()}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
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
                Add at least one work rate in Settings before
                creating a work record.
              </p>

              <PrimaryButton
                onClick={() => navigate("/settings")}
              >
                Go to Settings
              </PrimaryButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* FORM HEADING */}
              <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Sprout size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Work Information
                    </h2>

                    <p className="text-xs text-slate-500">
                      Enter farmer, field and work details
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-7 p-5 sm:p-7">

                {/* FARMER SELECTION */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <UserRound
                      size={18}
                      className="text-emerald-600"
                    />

                    <h3 className="font-semibold text-slate-800">
                      Farmer Details
                    </h3>
                  </div>

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

                  {/* SELECTED FARMER FINANCIAL SUMMARY */}
                  {selectedFarmer ? (
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

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            farmerStatus === "Advance"
                              ? "bg-amber-100 text-amber-700"
                              : farmerStatus === "Due"
                                ? "bg-rose-100 text-rose-700"
                                : farmerStatus === "Partial"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {farmerStatus} Account
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">

                        {/* BILLED */}
                        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                          <p className="text-xs text-slate-400">
                            Total Billed
                          </p>

                          <p className="mt-2 text-lg font-bold text-slate-800">
                            {formatCurrency(farmerBilled)}
                          </p>
                        </div>

                        {/* PAID */}
                        <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
                          <p className="text-xs text-slate-400">
                            Total Paid
                          </p>

                          <p className="mt-2 text-lg font-bold text-emerald-600">
                            {formatCurrency(farmerPaid)}
                          </p>
                        </div>

                        {/* DUE */}
                        <div className="rounded-2xl border border-rose-100 bg-white p-3 shadow-sm">
                          <p className="text-xs text-slate-400">
                            Remaining Due
                          </p>

                          <p className="mt-2 text-lg font-bold text-rose-600">
                            {formatCurrency(farmerDue)}
                          </p>
                        </div>

                        {/* ADVANCE */}
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
                          <div className="flex items-center gap-1">
                            <Wallet
                              size={13}
                              className="text-amber-600"
                            />

                            <p className="text-xs font-semibold text-amber-700">
                              Advance
                            </p>
                          </div>

                          <p className="mt-2 text-lg font-bold text-amber-700">
                            {formatCurrency(farmerAdvance)}
                          </p>
                        </div>
                      </div>

                      {/* ADVANCE NOTICE */}
                      {farmerAdvance > 0 && (
                        <div className="mx-4 mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
                          <Wallet
                            size={17}
                            className="mt-0.5 shrink-0 text-amber-600"
                          />

                          <div>
                            <p className="text-sm font-semibold text-amber-800">
                              Advance Balance Available
                            </p>

                            <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                              This farmer has {formatCurrency(farmerAdvance)}
                              {" "}in advance. It is shown separately and
                              will not be automatically deducted from this
                              work by this form.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                      Select a farmer to view their financial summary.
                    </div>
                  )}
                </section>

                {/* WORK INFORMATION */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <Tractor
                      size={18}
                      className="text-emerald-600"
                    />

                    <h3 className="font-semibold text-slate-800">
                      Work Details
                    </h3>
                  </div>

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

                    <Field label="Paid Amount">
                      <div className="relative">
                        <BadgeIndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          name="paidAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.paidAmount}
                          onChange={handleChange}
                          placeholder="e.g. 500"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                    </Field>
                  </div>
                </section>

                {/* LIVE WORK PAYMENT SUMMARY */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <Calculator
                      size={18}
                      className="text-emerald-600"
                    />

                    <div>
                      <h3 className="font-semibold text-slate-800">
                        New Work Payment Summary
                      </h3>

                      <p className="text-xs text-slate-500">
                        Automatically calculated from work duration and rate
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">
                        Work Amount
                      </p>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatCurrency(calculatedAmount)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-medium text-emerald-700">
                        Paid for this Work
                      </p>

                      <p className="mt-2 text-2xl font-bold text-emerald-700">
                        {formatCurrency(enteredPaidAmount)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-rose-50 p-4">
                      <p className="text-xs font-medium text-rose-700">
                        Remaining Due
                      </p>

                      <p className="mt-2 text-2xl font-bold text-rose-600">
                        {formatCurrency(dueAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5">

                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Payment Progress</span>

                      <span className="font-semibold text-emerald-700">
                        {Math.round(paidRatio * 100)}%
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
                        style={{
                          width: `${paidRatio * 100}%`,
                        }}
                      />
                    </div>

                    {extraPayment > 0 && (
                      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle
                          size={17}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>
                          <p className="text-sm font-semibold text-amber-800">
                            Payment exceeds work amount
                          </p>

                          <p className="mt-1 text-xs text-amber-700">
                            The entered payment exceeds this work's amount
                            by {formatCurrency(extraPayment)}. Confirm that
                            your backend supports storing this excess as
                            farmer advance before submitting.
                          </p>
                        </div>
                      </div>
                    )}

                    {calculatedAmount > 0 &&
                      enteredPaidAmount <= calculatedAmount &&
                      dueAmount === 0 && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                          <CheckCircle2 size={17} />
                          This work is fully paid.
                        </div>
                      )}
                  </div>
                </section>

                {/* EXISTING FARMER ADVANCE REMINDER */}
                {selectedFarmer && farmerAdvance > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Wallet size={19} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          Existing Farmer Advance
                        </p>

                        <p className="text-xs text-amber-700">
                          Separate from this work's payment
                        </p>
                      </div>
                    </div>

                    <p className="text-lg font-bold text-amber-700">
                      {formatCurrency(farmerAdvance)}
                    </p>
                  </div>
                )}

                {/* SUBMIT */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                  <p className="text-xs text-slate-400">
                    Please verify the farmer and work details before saving.
                  </p>

                  <PrimaryButton
                    type="submit"
                    disabled={submitting || loadingOptions}
                    className="flex min-w-48 items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        Save Work Record
                      </>
                    )}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          )}
        </Card>

        <p className="mt-5 text-center text-xs text-slate-400">
          Work amount is calculated using the selected work rate and total minutes.
        </p>
      </div>
    </div>
  );
}
