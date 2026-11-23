
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Menu,
  Search,
  Mic,
  MicOff,
  X,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "../redux/slice/authSlice";

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

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
      continue;
    }

    // Nukta combinations and other pairs
    if (DEV_MAP[pair]) {
      output += DEV_MAP[pair];
      i += 2;

      if (!MATRA_MAP[text[i]] && text[i] !== "्") {
        output += "a";
      }

      continue;
    }

    // Matras
    if (MATRA_MAP[char]) {
      output += MATRA_MAP[char];
      i++;
      continue;
    }

    // Virama
    if (char === "्") {
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

      if (!MATRA_MAP[text[i + 1]] && text[i + 1] !== "्") {
        output += "a";
      }

      i++;
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

const getSearchVariants = (input = "") => {
  const original = normalizeSearchText(input);
  const latin = normalizeSearchText(
    transliterateHindi(input)
  );

  const variants = new Set([
    original,
    latin,
    latin.replace(/aa/g, "a"),
    latin.replace(/ee/g, "i"),
    latin.replace(/oo/g, "u"),
    latin.replace(/ph/g, "f"),
    latin.replace(/v/g, "w"),
    latin.replace(/w/g, "v"),
  ]);

  return [...variants].filter(Boolean);
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Topbar({
  setMobileOpen,
  onSelectFarmer,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, loading: authLoading } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const debounceRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const abortRef = useRef(null);
  const queryRef = useRef("");

  const today = new Date().toLocaleDateString("en-IN");

  /* =====================================================
     FARMER SEARCH
  ===================================================== */

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
      const searchQueries = getSearchVariants(q);

      const responses = await Promise.all(
        searchQueries.map(async (searchTerm) => {
          try {
            const res = await axios.get(
              `${API_BASE}/api/farmer/search`,
              {
                params: {
                  query: searchTerm,
                },
                withCredentials: true,
                signal: controller.signal,
              }
            );

            const data =
              res?.data?.farmers ||
              res?.data?.data ||
              res?.data ||
              [];

            return Array.isArray(data) ? data : [];
          } catch (err) {
            if (
              axios.isCancel(err) ||
              err.name === "CanceledError" ||
              controller.signal.aborted
            ) {
              throw err;
            }

            console.warn(
              `Search failed for "${searchTerm}":`,
              err.message
            );

            return [];
          }
        })
      );

      if (controller.signal.aborted) return;

      // Merge and remove duplicate farmers
      const merged = responses.flat();

      const uniqueFarmers = Array.from(
        new Map(
          merged.map((farmer) => [
            farmer._id || farmer.id,
            farmer,
          ])
        ).values()
      ).filter((farmer) => farmer._id || farmer.id);

      setResults(uniqueFarmers);
    } catch (err) {
      if (
        axios.isCancel(err) ||
        err.name === "CanceledError" ||
        controller.signal.aborted
      ) {
        return;
      }

      console.error("Farmer search failed:", err);

      setError("Couldn't fetch results. Try again.");
      setResults([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  /* =====================================================
     VOICE RECOGNITION SETUP
  ===================================================== */

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    // Hindi voice recognition
    recognition.lang = "hi-IN";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript =
        finalTranscript || interimTranscript;

      if (currentTranscript.trim()) {
        queryRef.current = currentTranscript;
        setQuery(currentTranscript);
        setShowDropdown(true);
      }
    };

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);

      // Final transcript remains searchable
      if (queryRef.current.trim()) {
        setQuery(queryRef.current);
      }
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);

      setListening(false);

      if (event.error === "not-allowed") {
        setError("Please allow microphone permission.");
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
    };
  }, []);

  /* =====================================================
     DEBOUNCED SEARCH
  ===================================================== */

  useEffect(() => {
    clearTimeout(debounceRef.current);

    const q = query.trim();

    if (!q) {
      abortRef.current?.abort?.();

      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      setError(null);

      return;
    }

    setShowDropdown(true);

    debounceRef.current = setTimeout(() => {
      runSearch(q);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  /* =====================================================
     OUTSIDE CLICK / ESCAPE
  ===================================================== */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setQuery("");
        queryRef.current = "";
        setResults([]);
        setShowDropdown(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =====================================================
     MICROPHONE ACTIONS
  ===================================================== */

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    try {
      queryRef.current = "";
      setQuery("");
      setResults([]);
      setError(null);

      recognitionRef.current.start();
    } catch (err) {
      console.error(
        "Speech recognition failed to start:",
        err
      );
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      setListening(false);
    }
  };

  /* =====================================================
     SEARCH ACTIONS
  ===================================================== */

  const clearSearch = () => {
    abortRef.current?.abort?.();

    queryRef.current = "";

    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setLoading(false);
    setError(null);
  };

  const handleResultClick = (farmer) => {
    setShowDropdown(false);
    queryRef.current = "";

    setQuery("");
    setResults([]);

    onSelectFarmer?.(farmer);

    if (farmer?._id) {
      navigate(`/farmers/${farmer._id}`);
    }
  };

  /* =====================================================
     AUTH LOADING
  ===================================================== */

  if (authLoading && !user) {
    return (
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-8">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-stone-100 lg:hidden" />

          <div className="hidden h-9 w-64 animate-pulse rounded-2xl bg-stone-100 lg:block" />

          <div className="ml-auto h-10 w-10 animate-pulse rounded-full bg-stone-100" />
        </div>
      </header>
    );
  }

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-8">

        {/* Mobile Menu */}

        <button
          type="button"
          className="text-stone-500 transition hover:text-stone-700 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* Date */}

        <div className="hidden items-center gap-2 text-sm text-stone-400 lg:flex">
          <span>{today}</span>
        </div>

        {/* Search */}

        <div
          ref={searchWrapperRef}
          className="relative ml-0 max-w-md flex-1 lg:ml-6"
        >
          <div className="relative">

            <Search
              size={16}
              className="absolute left-3.5 top-3.5 text-stone-400"
            />

            <input
              value={query}
              onChange={(e) => {
                queryRef.current = e.target.value;
                setQuery(e.target.value);
              }}
              onFocus={() =>
                query.trim() && setShowDropdown(true)
              }
              placeholder="Search farmers, work records..."
              className="w-full rounded-2xl border border-transparent bg-stone-50 py-2.5 pl-10 pr-20 text-sm text-stone-800 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />

            {/* Loading */}

            {loading && (
              <Loader2
                size={16}
                className="absolute right-20 top-3 animate-spin text-stone-400"
              />
            )}

            {/* Clear */}

            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-12 top-2.5 text-stone-400 transition hover:text-stone-600"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}

            {/* Microphone */}

            <button
              type="button"
              onClick={
                listening ? stopListening : handleMicClick
              }
              disabled={!supported}
              className="absolute right-3.5 top-2 rounded-full p-1 text-stone-400 transition hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                supported
                  ? listening
                    ? "Stop listening"
                    : "Start Hindi voice search"
                  : "Speech recognition not supported"
              }
              aria-label={
                listening
                  ? "Stop voice search"
                  : "Start voice search"
              }
            >
              {listening ? (
                <MicOff
                  size={20}
                  className="text-red-500"
                />
              ) : (
                <Mic size={20} />
              )}
            </button>
          </div>

          {/* Listening Status */}

          {listening && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Listening... हिंदी में बोलें
            </p>
          )}

          {/* Search Dropdown */}

          {showDropdown && query.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-2xl border border-stone-100 bg-white shadow-xl ring-1 ring-black/5">

              {loading && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-stone-400">
                  Searching farmers...
                </div>
              )}

              {!loading && error && (
                <div className="px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              {!loading &&
                !error &&
                results.length === 0 && (
                  <div className="px-4 py-3 text-sm text-stone-400">
                    No farmers found for "{query}"
                  </div>
                )}

              {!loading &&
                !error &&
                results.map((farmer) => (
                  <button
                    key={farmer._id || farmer.id}
                    type="button"
                    onClick={() =>
                      handleResultClick(farmer)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-stone-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-semibold text-emerald-700">
                      {(farmer.name || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-800">
                        {farmer.name || "Unnamed farmer"}
                      </p>

                      {(farmer.village || farmer.phone) && (
                        <p className="truncate text-xs text-stone-400">
                          {[
                            farmer.village,
                            farmer.phone,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
