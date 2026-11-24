import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Menu,
  Search,
  Mic,
  MicOff,
  X,
  Loader2,
  CalendarDays,
  SearchX,
  AlertCircle,
  CornerDownLeft,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "../redux/slice/authSlice";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

/* =========================================================
   HINDI TO ENGLISH TRANSLITERATION
========================================================= */

const DEV_MAP = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee",
  "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e",
  "ऐ": "ai", "ओ": "o", "औ": "au",

  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",

  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z",
  "फ़": "f", "ड़": "r", "ढ़": "rh",

  "क्ष": "ksh",
  "त्र": "tr",
  "ज्ञ": "gy",
  "ळ": "l",
};

const MATRA_MAP = {
  "ा": "aa",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ॅ": "e",
  "ॉ": "o",
};

const INDEPENDENT_VOWELS = new Set("अआइईउऊऋएऐओऔ".split(""));
const NUKTA = "़";

// The inherent "a" is only added in the middle of a word (राम -> "raam", not "raama"),
// and never after an independent vowel (आम -> "aam", not "aaam").
const needsSchwa = (current, next) =>
  !INDEPENDENT_VOWELS.has(current[0]) &&
  Boolean(next) &&
  !MATRA_MAP[next] &&
  next !== "्" &&
  next !== NUKTA &&
  Boolean(DEV_MAP[next]);

const transliterateHindi = (input = "") => {
  const text = String(input).normalize("NFC");

  let output = "";
  let i = 0;

  while (i < text.length) {
    const triple = text.slice(i, i + 3);
    const pair = text.slice(i, i + 2);
    const char = text[i];

    // Conjuncts
    if (DEV_MAP[triple]) {
      output += DEV_MAP[triple];
      i += 3;
      if (needsSchwa(triple, text[i])) output += "a";
      continue;
    }

    // Nukta combinations and other pairs
    if (DEV_MAP[pair]) {
      output += DEV_MAP[pair];
      i += 2;
      if (needsSchwa(pair, text[i])) output += "a";
      continue;
    }

    // Matras
    if (MATRA_MAP[char]) {
      output += MATRA_MAP[char];
      i++;
      continue;
    }

    // Virama and stray nukta
    if (char === "्" || char === NUKTA) {
      i++;
      continue;
    }

    // Anusvara / Chandrabindu
    if (char === "ं" || char === "ँ") {
      output += "n";
      i++;
      continue;
    }

    // Visarga
    if (char === "ः") {
      output += "h";
      i++;
      continue;
    }

    // Individual Devanagari characters
    if (DEV_MAP[char]) {
      output += DEV_MAP[char];
      i++;
      if (needsSchwa(char, text[i])) output += "a";
      continue;
    }

    // Latin characters, numbers and spaces
    output += char;
    i++;
  }

  return output
    .toLowerCase()
    .replace(/[.,!?।॥\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   SEARCH VARIANTS
========================================================= */

const normalizeSearchText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?।॥\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// At most 4 distinct queries per search (it used to be up to 8 requests per keystroke)
// const getSearchVariants = (input = "") => {
//   const original = normalizeSearchText(input);
//   const latin = normalizeSearchText(transliterateHindi(input));

//   const simplified = latin
//     .replace(/aa/g, "a")
//     .replace(/ee/g, "i")
//     .replace(/oo/g, "u")
//     .replace(/ph/g, "f");

//   return [...new Set([original, latin, simplified, simplified.replace(/v/g, "w")])].filter(Boolean);
// };
const normalizePhonetic = (value = "") =>
  normalizeSearchText(value)
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/ii/g, "i")
    .replace(/oo/g, "u")
    .replace(/uu/g, "u")
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");

const getSearchVariants = (input = "") => {
  const original = normalizeSearchText(input);

  const latin = normalizeSearchText(
    transliterateHindi(input)
  );

  const simplified = latin
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/ii/g, "i")
    .replace(/oo/g, "u")
    .replace(/uu/g, "u")
    .replace(/ph/g, "f");

  const variants = [
    original,
    latin,
    simplified,
    simplified.replace(/v/g, "w"),
    normalizePhonetic(input),
    normalizePhonetic(latin),
  ];

  return [...new Set(variants)].filter(Boolean);
};

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

const farmerKey = (f) => f._id || f.id;

/* =========================================================
   COMPONENT
========================================================= */

export default function Topbar({ setMobileOpen, onSelectFarmer }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, loading: authLoading } = useSelector((state) => state.auth);

  // Only fetch when the store has no user yet (Sidebar and Login already fill it),
  // otherwise every page load made a duplicate request.
  useEffect(() => {
    if (!user) dispatch(getCurrentUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [micError, setMicError] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const recognitionRef = useRef(null);
  const debounceRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const abortRef = useRef(null);
  const queryRef = useRef("");
  const micErrorTimer = useRef(null);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    []
  );

  /* ---------------- farmer search ---------------- */

  const runSearch = useCallback(async (term) => {
    const q = String(term || "").trim();

    if (!q) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort?.();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const variants = getSearchVariants(q);
      let failed = 0;

      const responses = await Promise.all(
        variants.map(async (searchTerm) => {
          try {
            const res = await axios.get(`${API_BASE}/api/farmer/search`, {
              params: { query: searchTerm },
              withCredentials: true,
              signal: controller.signal,
            });

            const data = res?.data?.farmers || res?.data?.data || res?.data || [];
            return Array.isArray(data) ? data : [];
          } catch (err) {
            if (axios.isCancel(err) || err.name === "CanceledError" || controller.signal.aborted) {
              throw err;
            }
            failed += 1;
            console.warn(`Search failed for "${searchTerm}":`, err.message);
            return [];
          }
        })
      );

      if (controller.signal.aborted) return;

      // If every request failed this is an error, not "no farmers found"
      if (failed === variants.length) {
        throw new Error("All search requests failed");
      }

      // Merge and remove duplicate farmers
      const unique = Array.from(
        new Map(responses.flat().map((farmer) => [farmerKey(farmer), farmer])).values()
      ).filter((farmer) => farmerKey(farmer));

      setResults(unique);
      setActiveIndex(-1);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError" || controller.signal.aborted) {
        return;
      }
      console.error("Farmer search failed:", err);
      setError("Couldn't fetch results. Try again.");
      setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  /* ---------------- voice recognition ---------------- */

  const flashMicError = useCallback((message) => {
    clearTimeout(micErrorTimer.current);
    setMicError(message);
    micErrorTimer.current = setTimeout(() => setMicError(""), 3500);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }

    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.lang = "hi-IN"; // Hindi voice recognition

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      const current = finalTranscript || interimTranscript;

      if (current.trim()) {
        queryRef.current = current;
        setQuery(current);
        setShowDropdown(true);
      }
    };

    recognition.onstart = () => setListening(true);

    recognition.onend = () => {
      setListening(false);
      if (queryRef.current.trim()) setQuery(queryRef.current);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      setListening(false);

      if (event.error === "not-allowed") {
        flashMicError("Please allow microphone permission.");
      } else if (event.error === "no-speech") {
        flashMicError("Didn't hear anything. Try again.");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.stop();
      } catch {
        // Already stopped
      }

      abortRef.current?.abort?.();
      clearTimeout(debounceRef.current);
      clearTimeout(micErrorTimer.current);
    };
  }, [flashMicError]);

  /* ---------------- debounced search ---------------- */

  useEffect(() => {
    clearTimeout(debounceRef.current);

    const q = query.trim();

    if (!q) {
      abortRef.current?.abort?.();
      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
      return undefined;
    }

    setShowDropdown(true);

    debounceRef.current = setTimeout(() => runSearch(q), 400);

    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  /* ---------------- outside click ---------------- */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- actions ---------------- */

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    if (listening) {
      try {
        recognitionRef.current.stop();
      } catch {
        setListening(false);
      }
      return;
    }

    try {
      queryRef.current = "";
      setQuery("");
      setResults([]);
      setError(null);
      setMicError("");
      recognitionRef.current.start();
    } catch (err) {
      console.error("Speech recognition failed to start:", err);
    }
  };

  const clearSearch = () => {
    abortRef.current?.abort?.();
    queryRef.current = "";
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setLoading(false);
    setError(null);
    setActiveIndex(-1);
  };

  const handleResultClick = (farmer) => {
    setShowDropdown(false);
    queryRef.current = "";
    setQuery("");
    setResults([]);
    setActiveIndex(-1);

    onSelectFarmer?.(farmer);

    if (farmer?._id) navigate(`/farmers/${farmer._id}`);
  };

  // Keyboard handling lives on the input itself. A global Escape listener used to clear
  // this search whenever Escape was pressed anywhere (e.g. while closing a modal).
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (query || showDropdown) {
        e.preventDefault();
        clearSearch();
      }
      return;
    }

    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleResultClick(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  /* ---------------- auth loading ---------------- */

  if (authLoading && !user) {
    return (
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 px-4 py-3.5 sm:px-8">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-stone-100 lg:hidden" />
          <div className="hidden h-10 w-32 animate-pulse rounded-2xl bg-stone-100 lg:block" />
          <div className="h-11 max-w-md flex-1 animate-pulse rounded-2xl bg-stone-100" />
          <div className="ml-auto h-10 w-10 animate-pulse rounded-2xl bg-stone-100" />
        </div>
      </header>
    );
  }

  const userName = user?.name || "";
  const showStatus = !showDropdown && (listening || micError);

  /* ---------------- main ---------------- */

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-8">
        {/* Mobile menu */}
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-600 transition hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Date */}
        <div className="hidden shrink-0 items-center gap-2 rounded-2xl bg-stone-100 px-3.5 py-2.5 text-xs font-bold text-stone-500 lg:flex">
          <CalendarDays size={14} className="text-emerald-600" />
          {today}
        </div>

        {/* Search */}
        <div ref={searchWrapperRef} className="relative max-w-xl flex-1 lg:ml-2">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />

            <input
              value={query}
              onChange={(e) => {
                queryRef.current = e.target.value;
                setQuery(e.target.value);
              }}
              onFocus={() => query.trim() && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search farmers by name, village or phone"
              role="combobox"
              aria-expanded={showDropdown && Boolean(query.trim())}
              aria-controls="farmer-search-list"
              aria-activedescendant={activeIndex >= 0 ? `farmer-opt-${activeIndex}` : undefined}
              aria-autocomplete="list"
              className="w-full rounded-2xl border border-transparent bg-stone-100 py-3 pl-11 pr-28 text-sm font-semibold text-stone-800 outline-none transition-all duration-200 placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />

            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {loading && <Loader2 size={16} className="mr-1 animate-spin text-stone-400" />}

              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={handleMicClick}
                disabled={!supported}
                aria-pressed={listening}
                className={`rounded-full p-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                  listening
                    ? "animate-pulse bg-rose-500 text-white shadow-md shadow-rose-500/30"
                    : "text-stone-400 hover:bg-emerald-50 hover:text-emerald-600"
                }`}
                title={
                  supported
                    ? listening
                      ? "Stop listening"
                      : "Start Hindi voice search"
                    : "Speech recognition not supported"
                }
                aria-label={listening ? "Stop voice search" : "Start voice search"}
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
            </div>
          </div>

          {/* Listening / mic error status (floats, so the header never changes height) */}
          {showStatus && (
            <p
              className={`absolute left-2 top-full z-10 mt-1.5 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                micError ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
              }`}
              role="status"
            >
              {micError ? (
                <AlertCircle size={12} />
              ) : (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
              {micError || "Listening... हिंदी में बोलें"}
            </p>
          )}

          {/* Dropdown */}
          {showDropdown && query.trim() && (
            <div
              id="farmer-search-list"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-stone-900/15 ring-1 ring-stone-900/5"
            >
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Farmers
                </span>
                {!loading && !error && results.length > 0 && (
                  <span className="text-[11px] font-semibold text-stone-400">
                    {results.length} result{results.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading && results.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-stone-400">
                    <Loader2 size={15} className="animate-spin" />
                    Searching farmers...
                  </div>
                )}

                {!loading && error && (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-rose-600">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {!loading && !error && results.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
                      <SearchX size={22} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-stone-600">No farmers found</p>
                    <p className="mt-0.5 truncate text-xs text-stone-400">for &quot;{query}&quot;</p>
                  </div>
                )}

                {!error &&
                  results.map((farmer, idx) => {
                    const due = Number(farmer.totalDueAmount || 0);
                    const active = idx === activeIndex;

                    return (
                      <button
                        key={farmerKey(farmer)}
                        id={`farmer-opt-${idx}`}
                        role="option"
                        aria-selected={active}
                        type="button"
                        onClick={() => handleResultClick(farmer)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                          active ? "bg-emerald-50" : "hover:bg-stone-50"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTheme(
                            farmer.name
                          )} text-sm font-bold text-white shadow-sm`}
                        >
                          {(farmer.name || "?").charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-stone-900">
                            {farmer.name || "Unnamed farmer"}
                          </p>
                          {(farmer.village || farmer.phone) && (
                            <p className="truncate text-xs text-stone-400">
                              {[farmer.village, farmer.phone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>

                        {due > 0 && (
                          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 ring-1 ring-rose-100">
                            Due ₹{due.toLocaleString("en-IN")}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              {results.length > 0 && !error && (
                <div className="hidden items-center gap-3 border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-[11px] text-stone-400 sm:flex">
                  <span>↑↓ navigate</span>
                  <span className="inline-flex items-center gap-1">
                    <CornerDownLeft size={11} /> open
                  </span>
                  <span>Esc close</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User chip */}
        {user && (
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[10rem] truncate text-sm font-bold leading-tight text-stone-900">
                {userName}
              </p>
              <p className="text-[11px] font-semibold capitalize text-stone-400">{user.role}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20">
              {(userName || "?").trim().charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}