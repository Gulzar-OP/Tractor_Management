
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
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
  Users,
  Wallet,
  IndianRupee,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { inr } from "../../data/mockData";
import { FaRegTrashCan } from "react-icons/fa6";

const PER_PAGE = 5;
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const FARMERS_URL = `${API_BASE}/api/farmer/all-farmer`;
const DELETE_FARMER_URL = (id) =>
  `${API_BASE}/api/farmer/deleteFarmer/${id}`;

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

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function Avatar({ name, size = "h-10 w-10 text-sm" }) {
  return (
    <div
      className={`${size} shrink-0 rounded-full bg-gradient-to-br ${avatarTheme(
        name
      )} flex items-center justify-center font-semibold text-white shadow-sm ring-2 ring-white`}
    >
      {initials(name)}
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color, description }) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 truncate text-xl font-bold text-slate-800 sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${color}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </Card>
  );
}

export default function Farmers() {
  const navigate = useNavigate();

  const { user, loading: authLoading } = useSelector(
    (state) => state.auth
  );

  const isLoggedIn = Boolean(user);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageNum, setPageNum] = useState(1);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef(null);

  // Voice search
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

      setSearch(transcript);
      setPageNum(1);
    };

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Speech recognition failed:", err);
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const clearSearch = () => {
    setSearch("");
    setPageNum(1);
  };

  // Fetch farmers
  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(
        FARMERS_URL,
        {},
        { withCredentials: true }
      );

      const farmers =
        res.data?.farmers ||
        res.data?.data?.farmers ||
        res.data?.data ||
        [];

      setData(Array.isArray(farmers) ? farmers : []);
    } catch (e) {
      console.error("Error fetching farmers:", e);
      setError("Couldn't load farmers. Please try again.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      setLoading(false);
      return;
    }

    fetchFarmers();
  }, [authLoading, isLoggedIn, fetchFarmers]);

  // Summary calculations
  const summary = useMemo(() => {
    return data.reduce(
      (acc, farmer) => {
        acc.totalDue += Number(farmer.totalDueAmount || 0);
        acc.totalAdvance += Number(farmer.advanceAmount || 0);
        acc.totalWorkMinutes += Number(farmer.totalWorkMinutes || 0);

        if (Number(farmer.totalDueAmount || 0) > 0) {
          acc.farmersWithDue += 1;
        }

        if (Number(farmer.advanceAmount || 0) > 0) {
          acc.farmersWithAdvance += 1;
        }

        return acc;
      },
      {
        totalDue: 0,
        totalAdvance: 0,
        totalWorkMinutes: 0,
        farmersWithDue: 0,
        farmersWithAdvance: 0,
      }
    );
  }, [data]);

  // Search and filters
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((farmer) => {
      const name = (farmer.name || "").toLowerCase();
      const village = (farmer.village || "").toLowerCase();
      const phone = String(farmer.phone || "").toLowerCase();

      const due = Number(farmer.totalDueAmount || 0);
      const advance = Number(farmer.advanceAmount || 0);

      const matchesSearch =
        !query ||
        name.includes(query) ||
        village.includes(query) ||
        phone.includes(query);

      let matchesFilter = true;

      if (filter === "due") {
        matchesFilter = due > 0;
      } else if (filter === "cleared") {
        matchesFilter = due <= 0;
      } else if (filter === "advance") {
        matchesFilter = advance > 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [data, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(pageNum, totalPages);

  const paged = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  // Delete farmer
  const handleDelete = async (e, farmerId, farmerName) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      `Delete ${farmerName || "this farmer"}? This can't be undone.`
    );

    if (!confirmed) return;

    setDeletingId(farmerId);

    try {
      await axios.delete(DELETE_FARMER_URL(farmerId), {
        withCredentials: true,
      });

      setData((prev) =>
        prev.filter((farmer) => farmer._id !== farmerId)
      );
    } catch (err) {
      console.error("Error deleting farmer:", err);
      setError("Couldn't delete that farmer. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="space-y-6 px-3 sm:px-0">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-11 w-full max-w-md animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-stone-100 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-md shadow-emerald-100">
            <Sprout size={28} className="text-white" />
          </div>

          <h1 className="text-lg font-semibold text-stone-800">
            Log in to view farmers
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Farmer records, contact details, dues, and advance balances
            are tied to your account.
          </p>

          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >
            <LogIn size={16} />
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-3 sm:space-y-6 sm:px-0">
      <PageHeader
        title="Farmers"
        subtitle="Manage farmer records, payments and advance balances"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          title="Total Farmers"
          value={data.length}
          icon={Users}
          color="bg-sky-50 text-sky-600"
          description="Registered farmers"
        />

        <SummaryCard
          title="Total Due"
          value={inr(summary.totalDue)}
          icon={IndianRupee}
          color="bg-red-50 text-red-600"
          description={`${summary.farmersWithDue} farmers have pending dues`}
        />

        <SummaryCard
          title="Total Advance"
          value={inr(summary.totalAdvance)}
          icon={Wallet}
          color="bg-emerald-50 text-emerald-600"
          description={`${summary.farmersWithAdvance} farmers have advance`}
        />

        <SummaryCard
          title="Total Work Time"
          value={`${summary.totalWorkMinutes} min`}
          icon={Clock}
          color="bg-violet-50 text-violet-600"
          description="Combined work duration"
        />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <HiOutlineMagnifyingGlass
            size={16}
            className="absolute left-3.5 top-3.5 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNum(1);
            }}
            placeholder="Search name, village or phone"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-20 text-sm shadow-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />

          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-2.5 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}

          {supported && (
            <button
              type="button"
              onClick={listening ? stopListening : handleMicClick}
              className={`absolute right-3.5 top-2 transition ${
                listening
                  ? "text-red-500"
                  : "text-slate-400 hover:text-emerald-600"
              }`}
              title={listening ? "Stop listening" : "Start voice search"}
              aria-label={listening ? "Stop voice search" : "Start voice search"}
            >
              {listening ? (
                <span className="relative flex">
                  <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-red-400/40" />
                  <MicOff size={20} className="relative" />
                </span>
              ) : (
                <Mic size={20} />
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-auto"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPageNum(1);
            }}
          >
            <option value="all">All Farmers</option>
            <option value="due">With Due</option>
            <option value="advance">With Advance</option>
            <option value="cleared">No Due</option>
          </select>

          <button
            type="button"
            onClick={fetchFarmers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {listening && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Listening…
        </p>
      )}

      {/* Farmer list */}
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 p-0 shadow-sm">
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-green-50 px-4 py-5 sm:px-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/30 blur-3xl" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100 sm:flex">
                <Users size={20} />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-800 sm:text-lg">
                  Farmer List
                </h3>
                <p className="text-xs text-slate-500 sm:text-sm">
                  {filtered.length} farmer{filtered.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 sm:flex">
              <TrendingUp size={13} />
              Live records
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            <p className="text-sm">Loading farmers…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="mb-3 text-sm text-red-500">{error}</p>

            <button
              type="button"
              onClick={fetchFarmers}
              className="rounded-full bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Users size={24} />
            </div>

            <h4 className="text-sm font-semibold text-slate-700">
              No farmers found
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              Try a different name, village, or filter.
            </p>

            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  setPageNum(1);
                }}
                className="mt-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3.5 font-medium">Farmer</th>
                    <th className="px-5 py-3.5 font-medium">Phone</th>
                    <th className="px-5 py-3.5 font-medium">Village</th>
                    <th className="px-5 py-3.5 font-medium">Work Minutes</th>
                    <th className="px-5 py-3.5 font-medium">Due Amount</th>
                    <th className="px-5 py-3.5 font-medium">Advance</th>
                    <th className="px-5 py-3.5 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paged.map((f) => {
                    const due = Number(f.totalDueAmount || 0);
                    const advance = Number(f.advanceAmount || 0);

                    return (
                      <tr
                        key={f._id}
                        onClick={() => navigate(`/farmers/${f._id}`)}
                        className="group cursor-pointer border-b transition-colors last:border-0 hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={f.name}
                              size="h-9 w-9 text-xs"
                            />
                            <span className="font-medium text-slate-800">
                              {f.name || "Unnamed Farmer"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500">
                          {f.phone || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500">
                          {f.village || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500">
                          {f.totalWorkMinutes ?? 0} min
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ring-1 ${
                              due > 0
                                ? "bg-red-50 text-red-600 ring-red-100"
                                : "bg-slate-50 text-slate-400 ring-slate-100"
                            }`}
                          >
                            {inr(due)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ring-1 ${
                              advance > 0
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-slate-50 text-slate-400 ring-slate-100"
                            }`}
                          >
                            <Wallet size={12} />
                            {inr(advance)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDelete(e, f._id, f.name)
                              }
                              disabled={deletingId === f._id}
                              className="rounded-lg p-1.5 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              aria-label={`Delete ${f.name || "farmer"}`}
                              title="Delete farmer"
                            >
                              {deletingId === f._id ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <FaRegTrashCan />
                              )}
                            </button>

                            <ChevronRight
                              size={16}
                              className="text-slate-300 opacity-0 transition group-hover:opacity-100"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paged.map((f) => {
                const due = Number(f.totalDueAmount || 0);
                const advance = Number(f.advanceAmount || 0);

                return (
                  <div
                    key={f._id}
                    onClick={() => navigate(`/farmers/${f._id}`)}
                    className="flex items-start justify-between gap-3 p-4 transition-colors active:bg-slate-50"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar name={f.name} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">
                          {f.name || "Unnamed Farmer"}
                        </p>

                        <div className="mt-1.5 flex flex-col gap-1 text-xs text-slate-500">
                          {f.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone size={12} className="shrink-0" />
                              {f.phone}
                            </span>
                          )}

                          {f.village && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={12} className="shrink-0" />
                              {f.village}
                            </span>
                          )}

                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="shrink-0" />
                            {f.totalWorkMinutes ?? 0} min worked
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                              due > 0
                                ? "bg-red-50 text-red-600 ring-red-100"
                                : "bg-slate-50 text-slate-400 ring-slate-100"
                            }`}
                          >
                            {inr(due)} due
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                              advance > 0
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-slate-50 text-slate-400 ring-slate-100"
                            }`}
                          >
                            <Wallet size={11} />
                            {inr(advance)} advance
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) =>
                          handleDelete(e, f._id, f.name)
                        }
                        disabled={deletingId === f._id}
                        className="rounded-lg p-2 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        aria-label={`Delete ${f.name || "farmer"}`}
                      >
                        {deletingId === f._id ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <FaRegTrashCan size={14} />
                        )}
                      </button>

                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>

          <div className="rounded-xl bg-slate-50 px-3.5 py-2 text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </div>

          <button
            type="button"
            onClick={() =>
              setPageNum((p) => Math.min(totalPages, p + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
