
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Play,
  Pause,
  Square,
  Clock,
  IndianRupee,
  Tractor,
  Search,
  RefreshCw,
  User,
  Activity,
} from "lucide-react";

const BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${BASE_URL}/api/work`;
const FARMER_API = `${BASE_URL}/api/farmer`;
const WORK_RATE_API = `${BASE_URL}/api/rate`;

const normalizeStatus = (status) =>
  String(status || "").toUpperCase();

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getToday = () => new Date().toISOString().split("T")[0];

const getFarmerName = (farmer) => {
  if (!farmer) return "Unknown Farmer";
  if (typeof farmer === "string") return farmer;

  return (
    farmer.name ||
    farmer.fullName ||
    farmer.farmerName ||
    "Unknown Farmer"
  );
};

const getRateName = (rate) => {
  if (!rate) return "";
  if (typeof rate === "string") return rate;

  return (
    rate.name ||
    rate.type ||
    rate.workType ||
    rate.title ||
    "Work Rate"
  );
};

const getRateAmount = (rate) => {
  if (!rate) return 0;

  return Number(rate.rate || rate.ratePerHour || rate.amount || 0);
};

const getStatusColor = (status) => {
  switch (normalizeStatus(status)) {
    case "RUNNING":
      return "bg-green-100 text-green-700";

    case "PAUSED":
      return "bg-yellow-100 text-yellow-700";

    case "STOPPED":
    case "COMPLETED":
      return "bg-blue-100 text-blue-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function Works() {
  const [works, setWorks] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [workRates, setWorkRates] = useState([]);

  const [activeWork, setActiveWork] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [timerForm, setTimerForm] = useState({
    farmerId: "",
    fieldName: "",
    workRate: "",
    date: getToday(),
  });

  // --------------------------------------------------
  // Selected Farmer
  // --------------------------------------------------

  const selectedFarmer = useMemo(() => {
    return (
      farmers.find(
        (farmer) => farmer._id === timerForm.farmerId
      ) || null
    );
  }, [farmers, timerForm.farmerId]);

  // --------------------------------------------------
  // Timer
  // --------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timerSeconds = useMemo(() => {
    if (!activeWork) return 0;

    const accumulatedSeconds =
      Number(activeWork.totalMinutes || 0) * 60;

    const status = normalizeStatus(activeWork.status);

    if (status === "PAUSED") {
      return accumulatedSeconds;
    }

    if (status === "RUNNING") {
      const lastResumeTime = activeWork.lastResumeTime
        ? new Date(activeWork.lastResumeTime).getTime()
        : currentTime;

      const currentSessionSeconds = Math.max(
        0,
        Math.floor((currentTime - lastResumeTime) / 1000)
      );

      return accumulatedSeconds + currentSessionSeconds;
    }

    return accumulatedSeconds;
  }, [activeWork, currentTime]);

  // --------------------------------------------------
  // Fetch Works
  // --------------------------------------------------

  const fetchWorks = async () => {
    try {
      const response = await axios.post(
        `${API}/all-works`,
        {},
        {
          withCredentials: true,
        }
      );

      const data =
        response.data.works ||
        response.data.data ||
        response.data.workHistory ||
        [];

      const worksData = Array.isArray(data) ? data : [];

      setWorks(worksData);

      const runningWork = worksData.find(
        (work) => normalizeStatus(work.status) === "RUNNING"
      );

      const pausedWork = worksData.find(
        (work) => normalizeStatus(work.status) === "PAUSED"
      );

      setActiveWork(runningWork || pausedWork || null);
    } catch (error) {
      console.error("Fetch works error:", error);

      toast.error(
        error.response?.data?.message || "Failed to fetch works"
      );
    }
  };

  // --------------------------------------------------
  // Fetch Farmers
  // --------------------------------------------------

  const fetchFarmers = async () => {
    try {
      const response = await axios.post(
        `${FARMER_API}/all-farmer`,
        {},
        {
          withCredentials: true,
        }
      );

      const data =
        response.data.farmers ||
        response.data.all ||
        response.data.data ||
        response.data;

      setFarmers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Fetch farmers error:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message || "Failed to fetch farmers"
      );
    }
  };

  // --------------------------------------------------
  // Fetch Work Rates
  // --------------------------------------------------

  const fetchWorkRates = async () => {
    try {
      const response = await axios.get(`${WORK_RATE_API}/rates`, {
        withCredentials: true,
      });

      const data =
        response.data.workRates ||
        response.data.rates ||
        response.data.data ||
        response.data;

      setWorkRates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch work rates error:", error);
    }
  };

  // --------------------------------------------------
  // Initial Fetch
  // --------------------------------------------------

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        fetchWorks(),
        fetchFarmers(),
        fetchWorkRates(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // --------------------------------------------------
  // Start Work
  // --------------------------------------------------

  const handleStartWork = async (e) => {
    e.preventDefault();

    if (!timerForm.farmerId) {
      toast.error("Please select a farmer");
      return;
    }

    if (!timerForm.workRate) {
      toast.error("Please select a work rate");
      return;
    }

    if (!timerForm.fieldName.trim()) {
      toast.error("Please enter field name");
      return;
    }

    if (activeWork) {
      toast.error("A work is already running or paused");
      return;
    }

    try {
      setActionLoading(true);

      const response = await axios.post(
        `${API}/start`,
        {
          farmerId: timerForm.farmerId,
          fieldName: timerForm.fieldName.trim(),
          workRate: timerForm.workRate,
          date: timerForm.date,
        },
        {
          withCredentials: true,
        }
      );

      toast.success(
        response.data.message || "Work started successfully"
      );

      setTimerForm({
        farmerId: "",
        fieldName: "",
        workRate: "",
        date: getToday(),
      });

      await fetchWorks();
    } catch (error) {
      console.error("Start work error:", error);

      toast.error(
        error.response?.data?.message || "Failed to start work"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // Pause Work
  // --------------------------------------------------

  const handlePauseWork = async () => {
    if (!activeWork) return;

    try {
      setActionLoading(true);

      const response = await axios.post(
        `${API}/${activeWork._id}/pause`,
        {},
        {
          withCredentials: true,
        }
      );

      toast.success(response.data.message || "Work paused");

      await fetchWorks();
    } catch (error) {
      console.error("Pause work error:", error);

      toast.error(
        error.response?.data?.message || "Failed to pause work"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // Resume Work
  // --------------------------------------------------

  const handleResumeWork = async () => {
    if (!activeWork) return;

    try {
      setActionLoading(true);

      const response = await axios.post(
        `${API}/${activeWork._id}/resume`,
        {},
        {
          withCredentials: true,
        }
      );

      toast.success(response.data.message || "Work resumed");

      await fetchWorks();
    } catch (error) {
      console.error("Resume work error:", error);

      toast.error(
        error.response?.data?.message || "Failed to resume work"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // Stop Work
  // --------------------------------------------------

  const handleStopWork = async () => {
    if (!activeWork) return;

    const confirmStop = window.confirm(
      "Are you sure you want to complete this work? Available farmer advance will be adjusted automatically."
    );

    if (!confirmStop) return;

    try {
      setActionLoading(true);

      const response = await axios.post(
        `${API}/${activeWork._id}/stop`,
        {},
        {
          withCredentials: true,
        }
      );

      toast.success(
        response.data.message || "Work completed successfully"
      );

      setActiveWork(null);

      // Refresh works AND farmers after completion.
      await Promise.all([
        fetchWorks(),
        fetchFarmers(),
      ]);
    } catch (error) {
      console.error("Stop work error:", error);

      toast.error(
        error.response?.data?.message || "Failed to stop work"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // Refresh
  // --------------------------------------------------

  const handleRefresh = async () => {
    await Promise.all([
      fetchWorks(),
      fetchFarmers(),
      fetchWorkRates(),
    ]);

    toast.success("Data refreshed");
  };

  // --------------------------------------------------
  // Filter Works
  // --------------------------------------------------

  const filteredWorks = works.filter((work) => {
    const status = normalizeStatus(work.status);
    const farmerName = getFarmerName(work.farmer);

    const searchText = [
      farmerName,
      work.fieldName,
      work.workType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(
      searchTerm.toLowerCase()
    );

    const matchesFilter =
      filter === "ALL" ||
      status === filter ||
      (filter === "STOPPED" && status === "COMPLETED");

    return matchesSearch && matchesFilter;
  });

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  const completedWorks = works.filter((work) =>
    ["STOPPED", "COMPLETED"].includes(
      normalizeStatus(work.status)
    )
  );

  const totalMinutes = works.reduce(
    (total, work) => total + Number(work.totalMinutes || 0),
    0
  );

  const totalAmount = works.reduce(
    (total, work) => total + Number(work.totalAmount || 0),
    0
  );

  const totalPaid = works.reduce(
    (total, work) => total + Number(work.paidAmount || 0),
    0
  );

  const totalDue = works.reduce(
    (total, work) => total + Number(work.dueAmount || 0),
    0
  );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-500">Loading works...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Work Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage tractor work, timers and payments
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={actionLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          title="Total Works"
          value={works.length}
          icon={<Tractor />}
          color="green"
        />

        <StatCard
          title="Completed Works"
          value={completedWorks.length}
          icon={<Activity />}
          color="blue"
        />

        <StatCard
          title="Total Hours"
          value={`${(totalMinutes / 60).toFixed(1)} hrs`}
          icon={<Clock />}
          color="purple"
        />

        <StatCard
          title="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={<IndianRupee />}
          color="orange"
        />

      </div>

      {/* Payment Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="text-sm text-green-700">Total Paid</p>

          <h2 className="mt-2 text-2xl font-bold text-green-800">
            {formatCurrency(totalPaid)}
          </h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-sm text-red-700">Total Due</p>

          <h2 className="mt-2 text-2xl font-bold text-red-800">
            {formatCurrency(totalDue)}
          </h2>
        </div>

      </div>

      {/* Active Work */}

      {activeWork && (
        <div className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-gray-100 bg-green-50 p-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Active Work
              </h2>

              <p className="text-sm text-gray-500">
                Timer is currently{" "}
                {normalizeStatus(activeWork.status).toLowerCase()}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                activeWork.status
              )}`}
            >
              {normalizeStatus(activeWork.status)}
            </span>
          </div>

          <div className="p-5">

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              <div>
                <p className="text-sm text-gray-500">Farmer</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {getFarmerName(activeWork.farmer)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Field</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {activeWork.fieldName || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Work Type</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {activeWork.workType || "-"}
                </p>
              </div>

            </div>

            {/* Timer */}

            <div className="my-8 rounded-2xl bg-gray-900 p-6 text-center text-white">
              <p className="text-sm text-gray-400">
                Work Duration
              </p>

              <h1 className="my-3 font-mono text-4xl font-bold tracking-wider md:text-6xl">
                {formatDuration(timerSeconds)}
              </h1>

              <p className="text-sm text-gray-400">
                Rate: {formatCurrency(activeWork.ratePerHour)} / hour
              </p>
            </div>

            {/* Controls */}

            <div className="flex flex-wrap justify-center gap-3">

              {normalizeStatus(activeWork.status) === "RUNNING" && (
                <button
                  disabled={actionLoading}
                  onClick={handlePauseWork}
                  className="flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  <Pause size={18} />
                  Pause Work
                </button>
              )}

              {normalizeStatus(activeWork.status) === "PAUSED" && (
                <button
                  disabled={actionLoading}
                  onClick={handleResumeWork}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Play size={18} />
                  Resume Work
                </button>
              )}

              <button
                disabled={actionLoading}
                onClick={handleStopWork}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Square size={18} />
                {actionLoading ? "Completing..." : "Complete Work"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Start Work Form */}

      {!activeWork && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Start New Work
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select farmer and work details to start the timer
            </p>
          </div>

          <form
            onSubmit={handleStartWork}
            className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2"
          >

            {/* Farmer */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Farmer
              </label>

              <select
                value={timerForm.farmerId}
                onChange={(e) =>
                  setTimerForm((prev) => ({
                    ...prev,
                    farmerId: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                required
              >
                <option value="">Select Farmer</option>

                {farmers.map((farmer) => (
                  <option
                    key={farmer._id}
                    value={farmer._id}
                  >
                    {getFarmerName(farmer)}
                  </option>
                ))}
              </select>

              {/* Selected Farmer Advance */}

              {selectedFarmer && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Available Farmer Advance
                      </p>

                      <p className="mt-1 text-xs text-amber-700">
                        This advance will be adjusted when work is completed.
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-900">
                        {formatCurrency(
                          selectedFarmer.advanceAmount || 0
                        )}
                      </p>

                      <p className="text-xs text-amber-700">
                        {getFarmerName(selectedFarmer)}
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Work Rate */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Work Rate
              </label>

              <select
                value={timerForm.workRate}
                onChange={(e) =>
                  setTimerForm((prev) => ({
                    ...prev,
                    workRate: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                required
              >
                <option value="">Select Work Rate</option>

                {workRates.map((rate) => (
                  <option
                    key={rate._id}
                    value={rate._id}
                  >
                    {getRateName(rate)} -{" "}
                    {formatCurrency(getRateAmount(rate))}/hr
                  </option>
                ))}
              </select>
            </div>

            {/* Field Name */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Field Name
              </label>

              <input
                type="text"
                value={timerForm.fieldName}
                onChange={(e) =>
                  setTimerForm((prev) => ({
                    ...prev,
                    fieldName: e.target.value,
                  }))
                }
                placeholder="Enter field / location name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500"
                required
              />
            </div>

            {/* Date */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Work Date
              </label>

              <input
                type="date"
                value={timerForm.date}
                onChange={(e) =>
                  setTimerForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500"
                required
              />
            </div>

            {/* Start */}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={20} />

                {actionLoading
                  ? "Starting Work..."
                  : "Start Work Timer"}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Work History */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

        {/* Header */}

        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Work History
            </h2>

            <p className="text-sm text-gray-500">
              All recorded tractor works
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* Search */}

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search farmer or field..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 outline-none focus:border-green-500 sm:w-64"
              />
            </div>

            {/* Filter */}

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-green-500"
            >
              <option value="ALL">All Works</option>
              <option value="RUNNING">Running</option>
              <option value="PAUSED">Paused</option>
              <option value="STOPPED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

          </div>
        </div>

        {/* Desktop Table */}

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full">

            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Farmer
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Field
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Work Type
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Date
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Duration
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Rate
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Amount
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Paid
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Due
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {filteredWorks.map((work) => (
                <tr
                  key={work._id}
                  className="transition hover:bg-gray-50"
                >

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <User size={16} />
                      </div>

                      <span className="font-medium text-gray-900">
                        {getFarmerName(work.farmer)}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-700">
                    {work.fieldName || "-"}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-700">
                    {work.workType || "-"}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-700">
                    {formatDate(work.date || work.startTime)}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-gray-900">
                    {formatDuration(
                      Number(work.totalMinutes || 0) * 60
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-700">
                    {formatCurrency(work.ratePerHour)}
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(work.totalAmount)}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-green-700">
                    {formatCurrency(work.paidAmount)}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-red-600">
                    {formatCurrency(work.dueAmount)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                        work.status
                      )}`}
                    >
                      {normalizeStatus(work.status) === "STOPPED"
                        ? "COMPLETED"
                        : normalizeStatus(work.status)}
                    </span>
                  </td>

                </tr>
              ))}

              {filteredWorks.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    No works found
                  </td>
                </tr>
              )}

            </tbody>

          </table>
        </div>

        {/* Mobile Cards */}

        <div className="space-y-4 p-4 md:hidden">

          {filteredWorks.map((work) => (
            <div
              key={work._id}
              className="rounded-xl border border-gray-200 p-4"
            >

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {getFarmerName(work.farmer)}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {work.fieldName || "-"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                    work.status
                  )}`}
                >
                  {normalizeStatus(work.status) === "STOPPED"
                    ? "COMPLETED"
                    : normalizeStatus(work.status)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">

                <div>
                  <p className="text-xs text-gray-500">Work Type</p>
                  <p className="mt-1 text-sm font-medium">
                    {work.workType || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(work.date || work.startTime)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDuration(
                      Number(work.totalMinutes || 0) * 60
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Rate / Hour</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatCurrency(work.ratePerHour)}
                  </p>
                </div>

              </div>

              <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Total Amount
                  </span>

                  <span className="font-bold text-gray-900">
                    {formatCurrency(work.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Paid Amount
                  </span>

                  <span className="font-semibold text-green-700">
                    {formatCurrency(work.paidAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Due Amount
                  </span>

                  <span className="font-semibold text-red-600">
                    {formatCurrency(work.dueAmount)}
                  </span>
                </div>

              </div>

            </div>
          ))}

          {filteredWorks.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              No works found
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

// --------------------------------------------------
// Statistics Card
// --------------------------------------------------

function StatCard({ title, value, icon, color }) {
  const colors = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </h2>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}
