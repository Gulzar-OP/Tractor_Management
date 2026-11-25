import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Loader2,
  Mic,
  MicOff,
  X,
  LogIn,
  Sprout,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  ChevronLeft,
  Users,
  Wallet,
  IndianRupee,
  RefreshCw,
  Plus,
  UserPlus,
  Save,
  MapPinned,
  FileText,
  Search,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  AlertCircle,
  SearchX,
} from "lucide-react";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";
import { inr } from "../../data/mockData";

const PER_PAGE = 6;
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const FARMERS_URL = `${API}/farmer/all-farmer`;
const ADD_FARMER_URL = `${API}/farmer`;
const DELETE_FARMER_URL = (id) => `${API}/farmer/deleteFarmer/${id}`;
const ARCHIVE_FARMER_URL = (id) => `${API}/farmer/archive/${id}`;
const RESTORE_FARMER_URL = (id) => `${API}/farmer/restore/${id}`;

const EMPTY_FORM = {
  name: "",
  fatherName: "",
  phone: "",
  village: "",
  address: "",
  notes: "",
};

/* ------------------------------ helpers ------------------------------ */

const AVATAR_THEMES = [
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-pink-500",
  "from-lime-500 to-emerald-600",
  "from-violet-500 to-purple-500",
];

function avatarTheme(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const fmtMinutes = (m) => {
  const total = Math.round(Number(m) || 0);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm} min`;
};

// Voice input: every spoken field keyword, grouped by the form field it fills.
// The sentence is split at each keyword, so the order the user speaks in doesn't matter
// (e.g. "पिता का नाम ... नाम ..." no longer puts the father's name in the name field).
const VOICE_MARKERS = [
  ["fatherName", ["फादर नेम", "पिता जी का नाम", "पिताजी का नाम", "पिता का नाम", "बाप का नाम", "पापा का नाम", "पिताजी", "पिता", "बाप का", "पापा"]],
  ["phone", ["फोन नंबर", "मोबाइल नंबर", "फोन", "मोबाइल"]],
  ["village", ["विलेज", "गांव", "गाँव"]],
  ["address", ["पता", "एड्रेस"]],
  ["name", ["नाम"]],
];

const VOICE_LOOKUP = {};
VOICE_MARKERS.forEach(([field, words]) => words.forEach((w) => (VOICE_LOOKUP[w] = field)));

// Longest keywords first so "पिता का नाम" wins over the bare "नाम" inside it
const VOICE_REGEX = new RegExp(
  Object.keys(VOICE_LOOKUP)
    .sort((a, b) => b.length - a.length)
    .join("|"),
  "g"
);

function parseVoiceText(text) {
  const hits = [...text.matchAll(VOICE_REGEX)];
  const out = {};

  hits.forEach((hit, i) => {
    const field = VOICE_LOOKUP[hit[0]];
    const start = hit.index + hit[0].length;
    const end = hits[i + 1]?.index ?? text.length;
    const value = text.slice(start, end).trim();
    if (value && !out[field]) out[field] = value;
  });

  const phoneDigits = (out.phone || "").replace(/\D/g, "");
  const phoneFallback = text.match(/\d[\d\s]{8,13}\d/);

  return {
    name: out.name || "",
    fatherName: out.fatherName || "",
    phone: phoneDigits || (phoneFallback ? phoneFallback[0].replace(/\s/g, "") : ""),
    village: out.village || "",
    address: out.address || "",
  };
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "due", label: "With due" },
  { id: "advance", label: "With advance" },
  { id: "cleared", label: "No due" },
];

const fieldCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 text-sm font-semibold text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60";

function Avatar({ name, size = "h-12 w-12 text-sm" }) {
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTheme(
        name
      )} font-bold text-white shadow-md ring-2 ring-white`}
    >
      {initials(name)}
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function Farmers() {
  const navigate = useNavigate();

  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const isLoggedIn = Boolean(user);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageNum, setPageNum] = useState(1);
  // "active" = normal list, "archived" = archived farmers (restore screen)
  const [view, setView] = useState("active");
  const isArchivedView = view === "archived";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // { id, name, mode: "archive" | "delete" }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addListening, setAddListening] = useState(false);
  const [toast, setToast] = useState(null);

  // Separate recognizers for search and add-farmer voice input
  const recognitionRef = useRef(null);
  const addRecognitionRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  /* ---------------- voice search ---------------- */

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSearch(transcript);
      setPageNum(1);
    };

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => recognition.abort?.();
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    try {
      if (listening) recognitionRef.current.stop();
      else recognitionRef.current.start();
    } catch (err) {
      console.error("Speech recognition failed:", err);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setPageNum(1);
  };

  /* ---------------- fetch ---------------- */

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(
        FARMERS_URL,
        { archived: isArchivedView },
        { withCredentials: true }
      );

      const farmers =
        res.data?.farmers || res.data?.data?.farmers || res.data?.data || [];

      setData(Array.isArray(farmers) ? farmers : []);
    } catch (e) {
      console.error("Error fetching farmers:", e.response?.data || e);
      setError(e.response?.data?.message || "Couldn't load farmers. Please try again.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [isArchivedView]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchFarmers();
  }, [authLoading, isLoggedIn, fetchFarmers]);

  /* ---------------- add farmer ---------------- */

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const stopAddListening = useCallback(() => addRecognitionRef.current?.stop(), []);

  const startAddListening = () => {
    if (addListening) {
      stopAddListening();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("error", "Speech recognition is not supported in this browser.");
      return;
    }

    // Only one mic at a time
    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const parsed = parseVoiceText(transcript);

      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v)),
      }));
    };

    recognition.onerror = (event) => {
      setAddListening(false);
      showToast(
        "error",
        event?.error === "not-allowed"
          ? "Microphone permission is blocked."
          : "Couldn't catch that. Please try again."
      );
    };

    recognition.onstart = () => setAddListening(true);
    recognition.onend = () => setAddListening(false);

    addRecognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Add farmer voice recognition failed:", err);
      setAddListening(false);
    }
  };

  const closeAddModal = useCallback(() => {
    if (addSubmitting) return;
    stopAddListening();
    setShowAddModal(false);
    setFormData(EMPTY_FORM);
  }, [addSubmitting, stopAddListening]);

  const submitAddFarmer = async (e) => {
    e.preventDefault();
    if (addSubmitting) return;

    if (!formData.name.trim()) {
      showToast("error", "Farmer name is required.");
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (formData.phone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      showToast("error", "Enter a valid phone number (10 digits).");
      return;
    }

    setAddSubmitting(true);

    try {
      await axios.post(
        ADD_FARMER_URL,
        {
          ...formData,
          name: formData.name.trim(),
          fatherName: formData.fatherName.trim(),
          phone: formData.phone.trim(),
          village: formData.village.trim(),
          address: formData.address.trim(),
          notes: formData.notes.trim(),
        },
        { withCredentials: true }
      );

      stopAddListening();
      setShowAddModal(false);
      setFormData(EMPTY_FORM);
      showToast("success", "Farmer added successfully!");

      await fetchFarmers();

      setSearch("");
      setFilter("all");
      setPageNum(1);
    } catch (err) {
      console.error("Failed to add farmer:", err.response?.data || err);
      showToast("error", err.response?.data?.message || "Couldn't save farmer. Please try again.");
    } finally {
      setAddSubmitting(false);
    }
  };

  /* ---------------- delete ---------------- */

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;

    setDeletingId(target.id);

    try {
      if (target.mode === "archive") {
        const res = await axios.post(
          ARCHIVE_FARMER_URL(target.id),
          {},
          { withCredentials: true }
        );
        showToast("success", res.data?.message || "Farmer archived.");
        if (res.data?.warning) {
          setTimeout(() => showToast("success", res.data.warning), 3000);
        }
      } else {
        await axios.delete(DELETE_FARMER_URL(target.id), { withCredentials: true });
        showToast("success", "Farmer permanently deleted.");
      }

      setData((prev) => prev.filter((f) => f._id !== target.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Farmer action failed:", err.response?.data || err);
      // A failed action must not replace the whole list with the error screen
      showToast(
        "error",
        err.response?.data?.message ||
          (target.mode === "archive"
            ? "Couldn't archive farmer. Please try again."
            : "Couldn't delete farmer. Please try again.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  const restoreFarmer = async (farmer) => {
    setRestoringId(farmer._id);

    try {
      await axios.post(RESTORE_FARMER_URL(farmer._id), {}, { withCredentials: true });
      setData((prev) => prev.filter((f) => f._id !== farmer._id));
      showToast("success", `${farmer.name || "Farmer"} restored.`);
    } catch (err) {
      console.error("Restore failed:", err.response?.data || err);
      showToast("error", err.response?.data?.message || "Couldn't restore farmer.");
    } finally {
      setRestoringId(null);
    }
  };

  const switchView = (next) => {
    if (next === view) return;
    setView(next);
    setSearch("");
    setFilter("all");
    setPageNum(1);
  };

  /* ---------------- cleanup + Escape ---------------- */

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
      addRecognitionRef.current?.abort?.();
      clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!showAddModal && !deleteTarget) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (deleteTarget && !deletingId) setDeleteTarget(null);
      else if (showAddModal) closeAddModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddModal, deleteTarget, deletingId, closeAddModal]);

  /* ---------------- derived ---------------- */

  const summary = useMemo(
    () =>
      data.reduce(
        (acc, f) => {
          const due = Number(f.totalDueAmount || 0);
          const adv = Number(f.advanceAmount || 0);
          acc.totalDue += due;
          acc.totalAdvance += adv;
          acc.totalWorkMinutes += Number(f.totalWorkMinutes || 0);
          if (due > 0) acc.farmersWithDue += 1;
          else acc.cleared += 1;
          if (adv > 0) acc.farmersWithAdvance += 1;
          return acc;
        },
        { totalDue: 0, totalAdvance: 0, totalWorkMinutes: 0, farmersWithDue: 0, farmersWithAdvance: 0, cleared: 0 }
      ),
    [data]
  );

  const filterCounts = {
    all: data.length,
    due: summary.farmersWithDue,
    advance: summary.farmersWithAdvance,
    cleared: summary.cleared,
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((f) => {
      const due = Number(f.totalDueAmount || 0);
      const advance = Number(f.advanceAmount || 0);

      const matchesSearch =
        !query ||
        (f.name || "").toLowerCase().includes(query) ||
        (f.village || "").toLowerCase().includes(query) ||
        String(f.phone || "").toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filter === "due") return due > 0;
      if (filter === "cleared") return due <= 0;
      if (filter === "advance") return advance > 0;
      return true;
    });
  }, [data, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(pageNum, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
    setPageNum(1);
  };

  /* ---------------- states ---------------- */

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[2rem] bg-emerald-900/10" />
        <div className="h-14 animate-pulse rounded-3xl bg-stone-200/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-stone-200/70" />
          ))}
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-stone-900/5 ring-1 ring-stone-900/5">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-lg shadow-emerald-600/30">
            <Sprout size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-stone-900">Log in to view farmers</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Farmer records, contact details, dues, and advance balances are tied to your account.
          </p>
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <LogIn size={16} />
            Log in
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- main ---------------- */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-white/15">
              <Users size={13} />
              Farmers
            </div>
            <p className="mt-5 text-5xl font-extrabold tabular-nums tracking-tight">
              {data.length}
            </p>
            <p className="mt-1 text-sm text-emerald-100/80">
              {isArchivedView ? "archived" : "registered"} farmer{data.length === 1 ? "" : "s"}
              {isArchivedView ? " · restore them any time" : " · manage records, payments and advances"}
            </p>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-xl shadow-black/20 transition hover:bg-emerald-50 active:scale-[0.98]"
            >
              <Plus size={18} />
              Add Farmer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-3">
            <HeroChip
              icon={IndianRupee}
              label="Total due"
              value={inr(summary.totalDue)}
              hint={`${summary.farmersWithDue} with pending dues`}
              valueCls="text-rose-200"
            />
            <HeroChip
              icon={Wallet}
              label="Total advance"
              value={inr(summary.totalAdvance)}
              hint={`${summary.farmersWithAdvance} with advance`}
            />
            <HeroChip
              icon={Clock}
              label="Work time"
              value={fmtMinutes(summary.totalWorkMinutes)}
              hint="Combined duration"
            />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <section className="space-y-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-900/5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageNum(1);
              }}
              placeholder="Search name, village or phone"
              className={`${fieldCls} pl-11 pr-24`}
            />

            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              {supported && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  aria-pressed={listening}
                  className={`rounded-full p-2 transition ${
                    listening
                      ? "animate-pulse bg-rose-500 text-white"
                      : "text-stone-400 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                  title={listening ? "Stop listening" : "Start voice search"}
                  aria-label={listening ? "Stop voice search" : "Start voice search"}
                >
                  {listening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchFarmers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="inline-flex rounded-2xl bg-stone-100 p-1">
          {[
            { id: "active", label: "Active" },
            { id: "archived", label: "Archived" },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => switchView(v.id)}
              aria-pressed={view === v.id}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-bold transition ${
                view === v.id
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {v.id === "archived" && <Archive size={14} />}
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id);
                  setPageNum(1);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    active ? "bg-white/25" : "bg-white text-stone-500"
                  }`}
                >
                  {filterCounts[f.id]}
                </span>
              </button>
            );
          })}
        </div>

        {listening && (
          <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-rose-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            Listening…
          </p>
        )}
      </section>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-stone-200/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={26} />
          </div>
          <p className="mt-4 font-bold text-stone-800">{error}</p>
          <button
            type="button"
            onClick={fetchFarmers}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      ) : paged.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
            {data.length === 0 ? <Users size={28} /> : <SearchX size={28} />}
          </div>
          <h2 className="mt-4 font-bold text-stone-700">
            {data.length === 0
              ? isArchivedView
                ? "No archived farmers"
                : "No farmers yet"
              : "No farmers found"}
          </h2>
          <p className="mt-1 text-sm text-stone-400">
            {data.length === 0
              ? isArchivedView
                ? "Farmers you archive will show up here."
                : "Add your first farmer to get started."
              : "Try a different name, village, or filter."}
          </p>
          {data.length === 0 ? (
            isArchivedView ? null :
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Farmer
            </button>
          ) : (
            (search || filter !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 text-sm font-bold text-emerald-700 hover:underline"
              >
                Clear filters
              </button>
            )
          )}
        </div>
      ) : (
        <>
          <p className="px-1 text-sm font-semibold text-stone-500">
            {filtered.length} farmer{filtered.length !== 1 ? "s" : ""} found
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paged.map((f) => {
              const due = Number(f.totalDueAmount || 0);
              const advance = Number(f.advanceAmount || 0);
              const open = () => navigate(`/farmers/${f._id}`);

              return (
                <article
                  key={f._id}
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open();
                    }
                  }}
                  className="group relative cursor-pointer rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-900/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={f.name} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-stone-900">
                        {f.name || "Unnamed Farmer"}
                      </h3>
                      <div className="mt-1 space-y-0.5 text-xs text-stone-500">
                        {f.village && (
                          <p className="flex items-center gap-1.5">
                            <MapPin size={12} className="shrink-0 text-stone-400" />
                            <span className="truncate">{f.village}</span>
                          </p>
                        )}
                        {f.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone size={12} className="shrink-0 text-stone-400" />
                            {f.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isArchivedView ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreFarmer(f);
                            }}
                            disabled={restoringId === f._id}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                            aria-label={`Restore ${f.name || "farmer"}`}
                            title="Restore farmer"
                          >
                            {restoringId === f._id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <ArchiveRestore size={14} />
                            )}
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: f._id, name: f.name, mode: "delete" });
                            }}
                            disabled={deletingId === f._id}
                            className="rounded-xl p-2 text-stone-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                            aria-label={`Delete ${f.name || "farmer"} permanently`}
                            title="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: f._id, name: f.name, mode: "archive" });
                          }}
                          disabled={deletingId === f._id}
                          className="rounded-xl p-2 text-stone-300 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          aria-label={`Archive ${f.name || "farmer"}`}
                          title="Archive farmer"
                        >
                          {deletingId === f._id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Archive size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <div
                      className={`rounded-2xl p-3 ${
                        due > 0 ? "bg-rose-50" : "bg-stone-50"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                        Due
                      </p>
                      <p
                        className={`mt-0.5 font-extrabold tabular-nums ${
                          due > 0 ? "text-rose-600" : "text-stone-400"
                        }`}
                      >
                        {inr(due)}
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl p-3 ${
                        advance > 0 ? "bg-emerald-50" : "bg-stone-50"
                      }`}
                    >
                      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                        <Wallet size={11} />
                        Advance
                      </p>
                      <p
                        className={`mt-0.5 font-extrabold tabular-nums ${
                          advance > 0 ? "text-emerald-700" : "text-stone-400"
                        }`}
                      >
                        {inr(advance)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} className="text-stone-400" />
                      {fmtMinutes(f.totalWorkMinutes)} worked
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 transition group-hover:translate-x-0.5">
                      View
                      <ChevronRight size={15} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPageNum(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`h-10 w-10 rounded-xl text-sm font-bold transition ${
                    n === currentPage
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                      : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {n}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add farmer modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-6 py-5 text-white sm:px-8">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[28px] border-white/5" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold">Add New Farmer</h2>
                    <p className="text-xs text-emerald-100/80">Create a new farmer profile</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={addSubmitting}
                  className="rounded-xl p-2 text-emerald-100 transition hover:bg-white/10 disabled:opacity-40"
                  aria-label="Close modal"
                >
                  <X size={21} />
                </button>
              </div>
            </div>

            <form onSubmit={submitAddFarmer} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
                {/* Voice */}
                <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                        <Mic size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-800">Voice Input</p>
                        <p className="text-xs text-stone-500">Hindi mein farmer details boliye</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={startAddListening}
                      disabled={addSubmitting}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                        addListening
                          ? "animate-pulse bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                          : "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                      }`}
                    >
                      {addListening ? (
                        <>
                          <FiMicOff size={18} />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <IoMicOutline size={19} />
                          Speak Details
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-stone-500">
                    Example: <span className="font-semibold">नाम राम कुमार, पिता का नाम श्याम, गांव रामपुर, फोन नंबर 9876543210</span>
                  </p>
                </div>

                {/* Personal */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <UserPlus size={14} className="text-emerald-600" />
                    Personal information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-stone-600">
                        Farmer Name <span className="text-rose-500">*</span>
                      </span>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleAddChange}
                        placeholder="Enter farmer name"
                        required
                        disabled={addSubmitting}
                        className={`${fieldCls} px-4`}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-stone-600">
                        Father Name
                      </span>
                      <input
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleAddChange}
                        placeholder="Enter father name"
                        disabled={addSubmitting}
                        className={`${fieldCls} px-4`}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-stone-600">
                        Phone Number
                      </span>
                      <div className="relative">
                        <Phone
                          size={16}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                        <input
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          value={formData.phone}
                          onChange={handleAddChange}
                          placeholder="Enter phone number"
                          disabled={addSubmitting}
                          className={`${fieldCls} pl-11 pr-4`}
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-stone-600">
                        Village
                      </span>
                      <div className="relative">
                        <MapPin
                          size={16}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                        <input
                          name="village"
                          value={formData.village}
                          onChange={handleAddChange}
                          placeholder="Enter village"
                          disabled={addSubmitting}
                          className={`${fieldCls} pl-11 pr-4`}
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <MapPinned size={14} className="text-emerald-600" />
                    Address details
                  </h3>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleAddChange}
                    rows={2}
                    placeholder="Enter complete address..."
                    disabled={addSubmitting}
                    className={`${fieldCls} resize-none px-4`}
                  />
                </div>

                {/* Notes */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <FileText size={14} className="text-emerald-600" />
                    Additional notes
                  </h3>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleAddChange}
                    rows={3}
                    placeholder="Any additional information about this farmer..."
                    disabled={addSubmitting}
                    className={`${fieldCls} resize-none px-4`}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50/80 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={addSubmitting}
                  className="rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting || !formData.name.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {addSubmitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving Farmer...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save Farmer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingId) setDeleteTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                deleteTarget.mode === "archive"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-rose-100 text-rose-600"
              }`}
            >
              {deleteTarget.mode === "archive" ? <Archive size={22} /> : <Trash2 size={22} />}
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-stone-900">
              {deleteTarget.mode === "archive" ? "Archive" : "Permanently delete"}{" "}
              {deleteTarget.name || "this farmer"}?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              {deleteTarget.mode === "archive"
                ? "The farmer is hidden from lists and search, but all works, payments, dues and advance are kept. You can restore anytime from the Archived tab."
                : "This permanently deletes the farmer and all related works, payments and advance records. This action cannot be undone."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
              >
                Keep farmer
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${
                  deleteTarget.mode === "archive"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {deletingId && <Loader2 size={15} className="animate-spin" />}
                {deleteTarget.mode === "archive"
                  ? deletingId
                    ? "Archiving..."
                    : "Archive"
                  : deletingId
                    ? "Deleting..."
                    : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-4 z-[120] flex max-w-sm items-center gap-2.5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-stone-800 shadow-2xl shadow-stone-900/15 ring-1 ring-stone-900/5 sm:bottom-8 sm:right-8"
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ parts ------------------------------ */

function HeroChip({ icon: Icon, label, value, hint, valueCls = "" }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70">
        <Icon size={12} />
        {label}
      </p>
      <p className={`mt-1 truncate text-lg font-extrabold tabular-nums ${valueCls}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-emerald-100/60">{hint}</p>
    </div>
  );
}