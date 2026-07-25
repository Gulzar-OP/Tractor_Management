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
import { Loader2, Mic, MicOff, X, LogIn, Sprout } from "lucide-react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { inr } from "../../data/mockData";
import { FaRegTrashCan } from "react-icons/fa6";

const PER_PAGE = 5;
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const FARMERS_URL = `${API_BASE}/api/farmer/all-farmer`;
const DELETE_FARMER_URL = (id) => `${API_BASE}/api/farmer/deleteFarmer/${id}`;

export default function Farmers() {
  const navigate = useNavigate();

  // Same auth shape used across the app: { role, data: {...} }
  const { user, loading: authLoading } = useSelector((state) => state.auth);
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
      console.error("Speech recognition failed to start:", err);
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const clearSearch = () => {
    setSearch("");
    setPageNum(1);
  };

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        FARMERS_URL,
        {},
        { withCredentials: true }
      );
      setData(res.data?.farmers || []);
    } catch (e) {
      console.error("Error fetching farmers:", e);
      setError("Couldn't load farmers. Please try again.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only hit the backend once we know a session exists — avoids a guaranteed
  // 401 (and the loading spinner that goes with it) when logged out.
  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchFarmers();
  }, [authLoading, isLoggedIn, fetchFarmers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const village = (f.village || "").toLowerCase();
      const due = Number(f.totalDueAmount || 0);

      const matchesSearch =
        !query || name.includes(query) || village.includes(query);

      const matchesFilter =
        filter === "all" ? true : filter === "due" ? due > 0 : due <= 0;

      return matchesSearch && matchesFilter;
    });
  }, [data, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(pageNum, totalPages);

  const paged = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  const handleDelete = async (e, farmerId, farmerName) => {
    e.stopPropagation(); // don't also trigger the row's navigate

    const confirmed = window.confirm(
      `Delete ${farmerName || "this farmer"}? This can't be undone.`
    );
    if (!confirmed) return;

    setDeletingId(farmerId);
    try {
      await axios.delete(DELETE_FARMER_URL(farmerId), {
        withCredentials: true,
      });
      setData((prev) => prev.filter((f) => f._id !== farmerId));
    } catch (err) {
      console.error("Error deleting farmer:", err);
      setError("Couldn't delete that farmer. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // --- Auth still resolving ---
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-11 w-full max-w-md animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  // --- Not logged in ---
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-stone-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-sm">
            <Sprout size={28} className="text-white" />
          </div>

          <h1 className="text-lg font-semibold text-stone-800">
            Log in to view farmers
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Farmer records, contact details, and dues are tied to your
            account — sign in to see them.
          </p>

          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.98]"
          >
            <LogIn size={16} />
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farmers"
        subtitle="Manage farmer records and contact details"
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
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
            placeholder="Search by name or village"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-20 text-sm shadow-sm outline-none transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />

          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-2.5 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          ) : null}

          {supported && (
            <button
              type="button"
              onClick={listening ? stopListening : handleMicClick}
              className="absolute right-3.5 top-2 text-slate-400 transition hover:text-emerald-600"
              title={listening ? "Stop listening" : "Start voice search"}
              aria-label={listening ? "Stop voice search" : "Start voice search"}
            >
              {listening ? (
                <MicOff size={20} className="text-red-500" />
              ) : (
                <Mic size={20} />
              )}
            </button>
          )}
        </div>

        <select
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPageNum(1);
          }}
        >
          <option value="all">All</option>
          <option value="due">With Due</option>
          <option value="cleared">Cleared</option>
        </select>
      </div>

      {listening && <p className="text-xs text-emerald-600">Listening…</p>}

      <Card className="overflow-hidden border border-slate-200 p-0 shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-green-50 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Farmer List</h3>
          <p className="text-sm text-slate-500">
            Search and filter your farmer records
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 size={24} className="mb-3 animate-spin" />
            <p className="text-sm">Loading farmers…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="mb-3 text-sm text-red-500">{error}</p>
            <button
              onClick={fetchFarmers}
              className="rounded-full bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3.5 font-medium">Farmer</th>
                  <th className="px-5 py-3.5 font-medium">Phone</th>
                  <th className="px-5 py-3.5 font-medium">Village</th>
                  <th className="px-5 py-3.5 font-medium">Work Minutes</th>
                  <th className="px-5 py-3.5 font-medium">Due</th>
                  <th className="px-5 py-3.5 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-slate-500"
                    >
                      No farmers found.
                    </td>
                  </tr>
                ) : (
                  paged.map((f) => (
                    <tr
                      key={f._id}
                      onClick={() => navigate(`/farmers/${f._id}`)}
                      className="cursor-pointer border-b transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {f.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {f.phone || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {f.village || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {f.totalWorkMinutes ?? 0}
                      </td>
                      <td
                        className={`px-5 py-3.5 font-bold ${
                          Number(f.totalDueAmount || 0) > 0
                            ? "text-red-600"
                            : "text-slate-400"
                        }`}
                      >
                        {inr(Number(f.totalDueAmount || 0))}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, f._id, f.name)}
                          disabled={deletingId === f._id}
                          className="rounded-lg p-1.5 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          aria-label={`Delete ${f.name || "farmer"}`}
                          title="Delete farmer"
                        >
                          {deletingId === f._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FaRegTrashCan />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && !error && filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}