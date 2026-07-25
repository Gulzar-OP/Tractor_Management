import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Menu,
  Search,
  Mic,
  MicOff,
  X,
  Loader2,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Phone,
  Mail,
  Sprout,
  Tractor,
  LogIn,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser, logoutUser } from "../redux/slice/authSlice";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

export default function Topbar({ setMobileOpen, onSelectFarmer }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, loading: authLoading } = useSelector((state) => state.auth);

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
  const [showProfile, setShowProfile] = useState(false);

  const recognitionRef = useRef(null);
  const debounceRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const profileWrapperRef = useRef(null);
  const abortRef = useRef(null);

  const today = new Date().toLocaleDateString();
  const role = user?.data.role; // "owner" | "driver"
  const userData = user?.data || {};
  const ownerId = userData.owner || null;

  const runSearch = useCallback(async (term) => {
    const q = term.trim();
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
      const res = await axios.get(`${API_BASE}/api/farmer/search`, {
        params: { query: q },
        signal: controller.signal,
      });

      const data = res?.data?.farmers || res?.data?.data || res?.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name === "CanceledError") return;
      console.error("Farmer search failed:", err);
      setError("Couldn't fetch results. Try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Voice search setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuery(transcript);
    };

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) {
      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    setShowDropdown(true);
    debounceRef.current = setTimeout(() => runSearch(q), 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  // Outside click / escape handling — search and profile are independent
  // regions, so each gets its own ref instead of sharing one (this was
  // causing the profile menu to flicker open/closed before).
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
      if (
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(e.target)
      ) {
        setShowProfile(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setShowDropdown(false);
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Speech recognition failed to start:", err);
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleResultClick = (farmer) => {
    setShowDropdown(false);
    setQuery("");
    setResults([]);
    onSelectFarmer?.(farmer);
    if (farmer?._id) navigate(`/farmers/${farmer._id}`);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_BASE}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      dispatch(logoutUser());
      navigate("/auth");
    }
  };

  const profileInitial = userData?.name?.charAt(0)?.toUpperCase?.() || "U";
  const isDriver = role === "driver";
  const isLoggedIn = Boolean(user);

  // Still resolving the session — render a quiet placeholder instead of
  // popping the header in once auth settles.
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

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-8">
        <button
          className="text-stone-500 transition hover:text-stone-700 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

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
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setShowDropdown(true)}
              placeholder="Search farmers, work records..."
              className="w-full rounded-2xl border border-transparent bg-stone-50 py-2.5 pl-10 pr-20 text-sm text-stone-800 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />

            {loading && (
              <Loader2
                size={16}
                className="absolute right-20 top-3 animate-spin text-stone-400"
              />
            )}

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

            <button
              type="button"
              onClick={listening ? stopListening : handleMicClick}
              disabled={!supported}
              className="absolute right-3.5 top-2 rounded-full p-1 text-stone-400 transition hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                supported
                  ? listening
                    ? "Stop listening"
                    : "Start voice search"
                  : "Speech recognition not supported"
              }
              aria-label={listening ? "Stop voice search" : "Start voice search"}
            >
              {listening ? (
                <MicOff size={20} className="text-red-500" />
              ) : (
                <Mic size={20} />
              )}
            </button>
          </div>

          {listening && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Listening...
            </p>
          )}

          {showDropdown && query.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-2xl border border-stone-100 bg-white shadow-xl ring-1 ring-black/5">
              {loading && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-stone-400">
                  Searching...
                </div>
              )}

              {!loading && error && (
                <div className="px-4 py-3 text-sm text-red-500">{error}</div>
              )}

              {!loading && !error && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-stone-400">
                  No farmers found for &quot;{query}&quot;
                </div>
              )}

              {!loading &&
                !error &&
                results.map((farmer) => (
                  <button
                    key={farmer._id || farmer.id}
                    type="button"
                    onClick={() => handleResultClick(farmer)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-stone-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-semibold text-emerald-700">
                      {(farmer.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-800">
                        {farmer.name || "Unnamed farmer"}
                      </p>
                      {(farmer.village || farmer.phone) && (
                        <p className="truncate text-xs text-stone-400">
                          {[farmer.village, farmer.phone]
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

        {/* Profile / auth */}
        <div ref={profileWrapperRef} className="relative ml-auto">
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.98]"
            >
              <LogIn size={16} />
              Log in
            </button>
          ) : (
          <>
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
            aria-haspopup="menu"
            aria-expanded={showProfile}
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 font-bold uppercase text-white shadow-sm ring-2 ring-white">
              {profileInitial}
              <span
                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                  isDriver ? "bg-amber-500" : "bg-emerald-600"
                }`}
              >
                {isDriver ? (
                  <Tractor size={9} className="text-white" />
                ) : (
                  <Sprout size={9} className="text-white" />
                )}
              </span>
            </div>

            <div className="hidden text-left sm:block">
              <p className="font-semibold leading-tight text-stone-800">
                {userData?.name || "User"}
              </p>
              {role && (
                <span className="text-[11px] font-medium text-stone-400">
                  {isDriver ? "Field Driver" : "Field Owner"}
                </span>
              )}
            </div>

            <ChevronDown
              size={18}
              className={`text-stone-400 transition-transform ${
                showProfile ? "rotate-180" : ""
              }`}
            />
          </button>

          {showProfile && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-2xl ring-1 ring-black/5"
            >
              <div
                className="relative overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-500 p-5 text-white"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 10px)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-bold uppercase text-emerald-700 shadow-inner">
                    {profileInitial}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {userData?.name || "User"}
                    </h2>
                    <p className="truncate text-sm text-emerald-50/90">
                      {userData?.email || ""}
                    </p>
                    {role && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/40 border-dashed bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide">
                        {isDriver ? (
                          <Tractor size={11} />
                        ) : (
                          <Sprout size={11} />
                        )}
                        {isDriver ? "Driver Account" : "Owner Account"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2">
                <div className="space-y-1.5 border-b border-stone-100 px-4 py-3">
                  <p className="text-xs font-medium text-stone-400">Contact</p>
                  {userData?.phone && (
                    <p className="flex items-center gap-2 text-sm text-stone-700">
                      <Phone size={13} className="text-stone-400" />
                      {userData.phone}
                    </p>
                  )}
                  {userData?.email && (
                    <p className="flex items-center gap-2 text-sm text-stone-700">
                      <Mail size={13} className="text-stone-400" />
                      {userData.email}
                    </p>
                  )}
                  {isDriver && ownerId && (
                    <p className="pt-1 text-xs text-stone-400">
                      Owner ID: {ownerId}
                    </p>
                  )}
                </div>

                <div className="py-1">
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                  >
                    <User size={16} />
                    My Profile
                  </button>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </button>
                </div>

                <hr className="my-1 border-stone-100" />

                <button
                  role="menuitem"
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Log out {isDriver ? "(Driver)" : "(Owner)"}
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </header>
  );
}