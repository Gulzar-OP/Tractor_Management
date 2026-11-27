import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Play,
  Pause,
  Square,
  Clock,
  IndianRupee,
  Tractor,
  RefreshCw,
  User,
  CalendarDays,
  MapPin,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Sprout,
  XCircle,
  ChevronDown,
  Hourglass,
  Info,
  Mic,
  MicOff,
} from "lucide-react";

const BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${BASE_URL}/api/work`;
const FARMER_API = `${BASE_URL}/api/farmer`;
const WORK_RATE_API = `${BASE_URL}/api/rate`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const normalizeStatus = (status) =>
  String(status || "").toUpperCase();

const displayStatus = (status) =>
  normalizeStatus(status) === "STOPPED"
    ? "COMPLETED"
    : normalizeStatus(status);

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return [h, m, s]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};

const formatDate = (date) => {
  if (!date) return "Current session";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "Current session";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const getFarmerName = (farmer) => {
  if (!farmer || typeof farmer === "string") {
    return "Unknown Farmer";
  }

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

  return Number(
    rate.rate || rate.ratePerHour || rate.amount || 0
  );
};

const normalizeVoiceText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?।॥\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatMinutes = (m = 0) => {
  const total = Math.max(0, Math.round(Number(m) || 0));
  const h = Math.floor(total / 60);
  return h > 0 ? `${h}h ${String(total % 60).padStart(2, "0")}m` : `${total}m`;
};

const liveMinutesOf = (work) => {
  const base = Number(work?.totalMinutes || 0);
  if (normalizeStatus(work?.status) !== "RUNNING" || !work?.lastResumeTime) {
    return base;
  }
  return base + Math.max(0, (Date.now() - new Date(work.lastResumeTime).getTime()) / 60000);
};

const STATUS_STYLES = {
  RUNNING: {
    pill: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  PAUSED: {
    pill: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
    dot: "bg-amber-400",
  },
  IDLE: {
    pill: "bg-slate-200 text-slate-600 ring-slate-300",
    dot: "bg-slate-400",
  },
};


const DEVANAGARI_MAP = {
  // Vowels
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee",
  "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e",
  "ऐ": "ai", "ओ": "o", "औ": "au",

  // Consonants
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",

  // Nukta letters
  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z",
  "ड़": "r", "ढ़": "rh", "फ़": "f",

  // Conjuncts
  "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gy",

  // Additional letters
  "ळ": "l", "य़": "y",
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
  "ॆ": "e",
  "ॊ": "o",
};

const transliterateHindiToLatin = (input) => {
  const text = String(input || "").normalize("NFC");

  let output = "";
  let i = 0;

  while (i < text.length) {
    // Check 3-character combinations first
    const triple = text.slice(i, i + 3);

    if (DEVANAGARI_MAP[triple]) {
      output += DEVANAGARI_MAP[triple];
      i += 3;
      continue;
    }

    // Check 2-character combinations (Nukta / conjuncts)
    const pair = text.slice(i, i + 2);

    if (DEVANAGARI_MAP[pair]) {
      output += DEVANAGARI_MAP[pair];
      i += 2;

      const next = text[i];

      if (!MATRA_MAP[next] && next !== "्") {
        output += "a";
      }

      continue;
    }

    const char = text[i];

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

    // Individual letters
    if (DEVANAGARI_MAP[char]) {
      output += DEVANAGARI_MAP[char];

      const next = text[i + 1];

      if (!MATRA_MAP[next] && next !== "्") {
        output += "a";
      }

      i++;
      continue;
    }

    // Latin characters, digits and other symbols
    output += char;
    i++;
  }

  return normalizeVoiceText(output);
};

/* ------------------------------------------------------------------ */
/* Name matching                                                       */
/* ------------------------------------------------------------------ */

const compactVoiceText = (value) =>
  normalizeVoiceText(value).replace(/\s/g, "");

const getNameVariants = (value) => {
  const original = normalizeVoiceText(value);
  const transliterated = transliterateHindiToLatin(value);

  const variants = new Set([
    original,
    transliterated,
    compactVoiceText(original),
    compactVoiceText(transliterated),
  ]);

  // Common Hindi/English transliteration variations
  [original, transliterated].forEach((text) => {
    variants.add(text.replace(/aa/g, "a"));
    variants.add(text.replace(/ee/g, "i"));
    variants.add(text.replace(/oo/g, "u"));
    variants.add(text.replace(/ph/g, "f"));
    variants.add(text.replace(/v/g, "w"));
    variants.add(text.replace(/w/g, "v"));
    variants.add(text.replace(/sh/g, "s"));
    variants.add(text.replace(/chh/g, "ch"));
  });

  return [...variants].filter(Boolean);
};

const levenshteinDistance = (a, b) => {
  const s = String(a || "");
  const t = String(b || "");

  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const dp = Array.from({ length: s.length + 1 }, () =>
    Array(t.length + 1).fill(0)
  );

  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[s.length][t.length];
};

const similarityScore = (a, b) => {
  const left = compactVoiceText(a);
  const right = compactVoiceText(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const distance = levenshteinDistance(left, right);

  return 1 - distance / Math.max(left.length, right.length);
};

const getMatchScore = (spoken, storedName) => {
  const spokenVariants = getNameVariants(spoken);
  const storedVariants = getNameVariants(storedName);

  let bestScore = 0;

  for (const spokenVariant of spokenVariants) {
    for (const storedVariant of storedVariants) {
      if (!spokenVariant || !storedVariant) continue;

      if (spokenVariant === storedVariant) {
        return 1;
      }

      // Exact prefix / partial matching
      if (
        spokenVariant.length >= 3 &&
        storedVariant.length >= 3 &&
        (spokenVariant.includes(storedVariant) ||
          storedVariant.includes(spokenVariant))
      ) {
        bestScore = Math.max(bestScore, 0.88);
      }

      bestScore = Math.max(
        bestScore,
        similarityScore(spokenVariant, storedVariant)
      );
    }
  }

  return bestScore;
};

/**
 * Match voice input with a DB record.
 * Avoids selecting wrong person when candidates have close scores.
 */
const findBestVoiceMatch = (
  spokenText,
  items,
  getName,
  options = {}
) => {
  const {
    minimumScore = 0.72,
    minimumMargin = 0.08,
  } = options;

  const spoken = normalizeVoiceText(spokenText);

  if (!spoken || !Array.isArray(items) || !items.length) {
    return {
      item: null,
      score: 0,
      ambiguous: false,
      candidates: [],
    };
  }

  const scored = items
    .map((item) => ({
      item,
      name: getName(item),
      score: getMatchScore(spoken, getName(item)),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];

  if (!best || best.score < minimumScore) {
    return {
      item: null,
      score: best?.score || 0,
      ambiguous: false,
      candidates: scored.slice(0, 3),
    };
  }

  // Very close matches? Don't auto-select.
  if (
    second &&
    second.score >= minimumScore &&
    best.score - second.score < minimumMargin
  ) {
    return {
      item: null,
      score: best.score,
      ambiguous: true,
      candidates: scored.slice(0, 3),
    };
  }

  return {
    item: best.item,
    score: best.score,
    ambiguous: false,
    candidates: scored.slice(0, 3),
  };
};

/* ------------------------------------------------------------------ */
/* Voice parsing                                                       */
/* ------------------------------------------------------------------ */

const parseWorkVoiceText = (text) => {
  const input = String(text || "").trim();

  const farmerMatch = input.match(
    /(?:किसान|फार्मर|farmer|नाम)\s+(.+?)(?=\s*(?:काम|वर्क|work|रेट|rate|खेत|फील्ड|field|जगह|लोकेशन|location|$))/i
  );

  const rateMatch = input.match(
    /(?:काम|वर्क|work|रेट|rate)\s+(.+?)(?=\s*(?:किसान|फार्मर|farmer|नाम|खेत|फील्ड|field|जगह|लोकेशन|location|$))/i
  );

  const fieldMatch = input.match(
    /(?:खेत|फील्ड|field|जगह|लोकेशन|location)\s+(.+)/i
  );

  return {
    farmerName: farmerMatch?.[1]?.trim() || "",
    rateName: rateMatch?.[1]?.trim() || "",
    fieldName: fieldMatch?.[1]?.trim() || "",
  };
};

const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

const inputCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 py-3.5 pl-11 pr-4 text-sm font-medium text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Works() {
  const [farmers, setFarmers] = useState([]);
  const [workRates, setWorkRates] = useState([]);
  const [activeWork, setActiveWork] = useState(null);
  // Sirf owner ko: baaki drivers ke chalte / ruke kaam
  const [otherActive, setOtherActive] = useState([]);
  // /active fetch fail hua to "No active work" nahi, retry dikhana hai
  const [activeLoadFailed, setActiveLoadFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [voiceListening, setVoiceListening] = useState(false);

  const recognitionRef = useRef(null);
  const [voiceLanguage, setVoiceLanguage] = useState("hi-IN");

  const [timerForm, setTimerForm] = useState({
    farmerId: "",
    fieldName: "",
    workRate: "",
    date: getToday(),
  });

  const status = normalizeStatus(activeWork?.status);

  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f._id === timerForm.farmerId) || null,
    [farmers, timerForm.farmerId]
  );

  const selectedRate = useMemo(
    () => workRates.find((r) => r._id === timerForm.workRate) || null,
    [workRates, timerForm.workRate]
  );

  /* ---------------- Live timer ---------------- */

  useEffect(() => {
    if (!isRunning) return undefined;

    setCurrentTime(Date.now());

    const id = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, activeWork?._id]);

  const timerSeconds = useMemo(() => {
    if (!activeWork) return 0;

    const accumulated = Number(activeWork.totalMinutes || 0) * 60;

    if (isRunning) {
      const resumedAt = activeWork.lastResumeTime
        ? new Date(activeWork.lastResumeTime).getTime()
        : currentTime;

      const session = Math.max(
        0,
        Math.floor((currentTime - resumedAt) / 1000)
      );

      return accumulated + session;
    }

    return accumulated;
  }, [activeWork, isRunning, currentTime]);

  const liveMinutes = Math.floor(timerSeconds / 60);

  const activeRate = Number(activeWork?.ratePerHour || 0);

  const estimatedAmount = Math.round(
    (timerSeconds / 3600) * activeRate
  );

  /* ---------------- Active work details ---------------- */

  const activeFarmerName = useMemo(() => {
    const f = activeWork?.farmer;

    if (!f) return "Unknown Farmer";

    if (typeof f === "string") {
      const found = farmers.find((x) => x._id === f);

      return found ? getFarmerName(found) : "Unknown Farmer";
    }

    return getFarmerName(f);
  }, [activeWork?.farmer, farmers]);

  const activeWorkType = useMemo(() => {
    if (activeWork?.workType) return activeWork.workType;

    const r = activeWork?.workRate;

    if (r && typeof r === "object") {
      return getRateName(r);
    }

    if (typeof r === "string") {
      const found = workRates.find((x) => x._id === r);

      if (found) return getRateName(found);
    }

    return "-";
  }, [activeWork, workRates]);

  /* ---------------- API ---------------- */

  // Is user ka apna chalta/ruka kaam (+ owner ke liye baaki drivers ke kaam)
  const fetchWorks = useCallback(async (silent = false) => {
    try {
      const res = await axios.get(`${API}/active`, {
        withCredentials: true,
      });

      setActiveWork(res.data?.mine || null);
      setOtherActive(
        Array.isArray(res.data?.others) ? res.data.others : []
      );
      setActiveLoadFailed(false);
    } catch (error) {
      console.error("Fetch active work error:", error);

      setActiveLoadFailed(true);

      if (!silent) {
        toast.error(
          error.response?.data?.message ||
            "Failed to fetch current work"
        );
      }
    }
  }, []);

  const fetchFarmers = useCallback(async () => {
    try {
      const res = await axios.post(
        `${FARMER_API}/all-farmer`,
        {},
        { withCredentials: true }
      );

      const data =
        res.data.farmers ||
        res.data.all ||
        res.data.data ||
        res.data;

      setFarmers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch farmers error:", error);

      toast.error(
        error.response?.data?.message || "Failed to fetch farmers"
      );
    }
  }, []);

  const fetchWorkRates = useCallback(async () => {
    try {
      const res = await axios.get(`${WORK_RATE_API}/rates`, {
        withCredentials: true,
      });

      const data =
        res.data.workRates ||
        res.data.rates ||
        res.data.data ||
        res.data;

      setWorkRates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch work rates error:", error);

      toast.error(
        error.response?.data?.message || "Failed to fetch work rates"
      );
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      await Promise.all([
        fetchWorks(),
        fetchFarmers(),
        fetchWorkRates(),
      ]);

      setLoading(false);
    };

    load();
  }, [fetchWorks, fetchFarmers, fetchWorkRates]);

  // Owner ko drivers ki list taazi rakhne ke liye 30 second me chup-chaap refresh
  useEffect(() => {
    if (!otherActive.length) return undefined;

    const id = setInterval(() => fetchWorks(true), 30000);
    return () => clearInterval(id);
  }, [otherActive.length, fetchWorks]);

  /* ---------------- Voice Input ---------------- */

  const handleVoiceInput = useCallback(() => {
    if (voiceListening) {
      recognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      toast.error(
        "Your browser does not support voice recognition"
      );
      return;
    }

    if (!farmers.length) {
      toast.error("Please add farmers first");
      return;
    }

    if (!workRates.length) {
      toast.error("Please add work rates first");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setVoiceListening(true);
      toast.success("Listening... Speak now");
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript || "";

      console.log("Work voice input:", transcript);

      if (!transcript.trim()) {
        toast.error("No voice input detected");
        return;
      }

      const parsed = parseWorkVoiceText(transcript);

      console.log("Parsed voice input:", parsed);

      const updates = {};
      const errors = [];

      /* ---------------- Farmer Matching ---------------- */

      if (parsed.farmerName) {
        const match = findBestVoiceMatch(
          parsed.farmerName,
          farmers,
          getFarmerName,
          {
            minimumScore: 0.72,
            minimumMargin: 0.08,
          }
        );

        if (match.item) {
          updates.farmerId = match.item._id;

          console.log(
            "Matched farmer:",
            getFarmerName(match.item),
            match.score
          );
        } else if (match.ambiguous) {
          errors.push(
            `Farmer name "${parsed.farmerName}" is ambiguous. Please select manually.`
          );
        } else {
          errors.push(
            `Farmer "${parsed.farmerName}" not found`
          );
        }
      }

      /* ---------------- Work Rate Matching ---------------- */

      if (parsed.rateName) {
        const match = findBestVoiceMatch(
          parsed.rateName,
          workRates,
          getRateName,
          {
            minimumScore: 0.72,
            minimumMargin: 0.08,
          }
        );

        if (match.item) {
          updates.workRate = match.item._id;

          console.log(
            "Matched work rate:",
            getRateName(match.item),
            match.score
          );
        } else if (match.ambiguous) {
          errors.push(
            `Work rate "${parsed.rateName}" is ambiguous. Please select manually.`
          );
        } else {
          errors.push(
            `Work rate "${parsed.rateName}" not found`
          );
        }
      }

      /* ---------------- Field / Location ---------------- */

      if (parsed.fieldName) {
        updates.fieldName = parsed.fieldName;
      }

      if (Object.keys(updates).length > 0) {
        setTimerForm((prev) => ({
          ...prev,
          ...updates,
        }));

        toast.success("Voice input applied successfully");
      } else {
        toast.error(
          "Could not understand. Try: किसान गुलजार काम रोटावेटर खेत नॉर्थ फील्ड"
        );
      }

      errors.forEach((message) => toast.error(message));
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);

      if (event.error === "not-allowed") {
        toast.error(
          "Microphone permission denied. Please allow microphone access."
        );
      } else if (event.error === "no-speech") {
        toast.error("No speech detected. Please try again.");
      } else {
        toast.error("Voice recognition failed. Please try again.");
      }

      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Recognition start error:", error);

      setVoiceListening(false);
      toast.error("Unable to start microphone");
    }
  }, [voiceListening, farmers, workRates, voiceLanguage]);

  /* ---------------- Voice cleanup ---------------- */

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;

        try {
          recognitionRef.current.stop();
        } catch {
          // Recognition may already be stopped.
        }
      }
    };
  }, []);

  /* ---------------- Actions ---------------- */

  const handleStartWork = async (e) => {
    e.preventDefault();

    if (actionLoading) return;

    if (!timerForm.farmerId) {
      return toast.error("Please select a farmer");
    }

    if (!timerForm.workRate) {
      return toast.error("Please select a work rate");
    }

    if (!timerForm.fieldName.trim()) {
      return toast.error("Please enter field name");
    }

    if (activeWork) {
      return toast.error(
        "A work is already running or paused"
      );
    }

    try {
      setActionLoading(true);

      const res = await axios.post(
        `${API}/start`,
        {
          farmerId: timerForm.farmerId,
          fieldName: timerForm.fieldName.trim(),
          workRate: timerForm.workRate,
          date: timerForm.date,
        },
        { withCredentials: true }
      );

      toast.success(
        res.data?.message || "Work started successfully"
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

      // Server ke hisaab se kaam pehle se chal raha ho to sahi state le aao
      if (error.response?.status === 409) {
        await fetchWorks(true);
      }

      toast.error(
        error.response?.data?.message ||
          "Failed to start work"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Shared handler for pause / resume / stop / cancel
  const runAction = async (
    path,
    successMsg,
    errorMsg,
    finishes = false
  ) => {
    if (!activeWork || actionLoading) return;

    try {
      setActionLoading(true);

      const res = await axios.post(
        `${API}/${activeWork._id}/${path}`,
        {},
        { withCredentials: true }
      );

      toast.success(res.data?.message || successMsg);

      if (finishes) {
        setActiveWork(null);

        await Promise.all([
          fetchWorks(),
          fetchFarmers(),
        ]);
      } else {
        await fetchWorks();
      }
    } catch (error) {
      console.error(`${path} work error:`, error);

      if ([403, 404, 409].includes(error.response?.status)) {
        await fetchWorks(true);
      }

      toast.error(
        error.response?.data?.message || errorMsg
      );
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handlePause = () =>
    runAction("pause", "Work paused", "Failed to pause work");

  const handleResume = () =>
    runAction("resume", "Work resumed", "Failed to resume work");

  const handleStop = () =>
    runAction(
      "stop",
      "Work completed successfully",
      "Failed to complete work",
      true
    );

  const handleCancel = () =>
    runAction(
      "cancel",
      "Work cancelled successfully",
      "Failed to cancel work",
      true
    );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchWorks(),
        fetchFarmers(),
        fetchWorkRates(),
      ]);

      toast.success("Data refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const setField = (key) => (e) =>
    setTimerForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));

  /* ---------------- Loading ---------------- */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lg shadow-emerald-900/10">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
          </div>

          <div className="text-center">
            <p className="font-bold text-stone-800">
              Loading Work Management
            </p>

            <p className="mt-1 text-sm text-stone-400">
              Fetching your current farm activity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pillStyle = STATUS_STYLES[
    isRunning ? "RUNNING" : isPaused ? "PAUSED" : "IDLE"
  ];

  /* ---------------- Main ---------------- */

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Sprout size={14} />
              Farm Operations
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900">
              Work Management
            </h1>

            <p className="mt-1 text-sm text-stone-500">
              Track your tractor sessions live, from start to payment.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || actionLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-emerald-50 hover:ring-emerald-200 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* Owner: baaki drivers abhi kya kar rahe hain */}

        {otherActive.length > 0 && (
          <section className="rounded-[2rem] bg-white p-5 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Abhi kaam par ({otherActive.length})
            </h2>

            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {otherActive.map((w) => {
                const running = normalizeStatus(w.status) === "RUNNING";

                return (
                  <li
                    key={w._id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-800">
                        {w.createdBy?.name || "Driver"}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {getFarmerName(w.farmer)} · {w.workType || getRateName(w.workRate) || "-"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                          running
                            ? STATUS_STYLES.RUNNING.pill.replace("text-emerald-300", "text-emerald-700").replace("bg-emerald-400/15", "bg-emerald-50")
                            : STATUS_STYLES.PAUSED.pill.replace("text-amber-300", "text-amber-700").replace("bg-amber-400/15", "bg-amber-50")
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            running ? "animate-pulse bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {running ? "Running" : "Paused"}
                      </span>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-stone-600">
                        {formatMinutes(liveMinutesOf(w))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ================= ACTIVE WORK ================= */}

        {activeLoadFailed && !activeWork ? (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertCircle size={26} />
            </div>
            <p className="mt-4 font-bold text-stone-800">
              Current kaam load nahi ho paya
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Net ya server ki dikkat ho sakti hai. Naya kaam shuru karne se pehle
              dobara try karo, kyunki ho sakta hai aapka timer chal raha ho.
            </p>
            <button
              type="button"
              onClick={() => fetchWorks()}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        ) : activeWork ? (
          <div className="grid gap-6 lg:grid-cols-5">

            {/* Timer card */}

            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8 lg:col-span-3">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ${pillStyle.pill}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${pillStyle.dot} ${
                        isRunning ? "animate-pulse" : ""
                      }`}
                    />

                    {displayStatus(activeWork.status)}
                  </span>

                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-100/70">
                    <CalendarDays size={14} />
                    {formatDate(activeWork.date)}
                  </span>
                </div>

                {/* Ring + time */}

                <div className="my-8 flex justify-center">
                  <TimerRing
                    seconds={timerSeconds}
                    running={isRunning}
                  >
                    <span className="font-mono text-4xl font-extrabold tracking-wider sm:text-5xl">
                      {formatDuration(timerSeconds)}
                    </span>

                    <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-200/60">
                      {isRunning ? "Live timer" : "Timer paused"}
                    </span>
                  </TimerRing>
                </div>

                {/* Stats */}

                <div className="grid grid-cols-3 gap-3">
                  <TimerStat
                    label="Minutes"
                    value={liveMinutes}
                  />

                  <TimerStat
                    label="Rate / hr"
                    value={formatCurrency(activeRate)}
                  />

                  <TimerStat
                    label="Earned"
                    value={formatCurrency(estimatedAmount)}
                    highlight
                  />
                </div>

                {/* Controls */}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {isRunning && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handlePause}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 text-sm font-extrabold text-amber-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Pause size={18} />

                      {actionLoading ? "Processing..." : "Pause"}
                    </button>
                  )}

                  {isPaused && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleResume}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Play size={18} />

                      {actionLoading ? "Processing..." : "Resume"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setConfirmAction("stop")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-emerald-900 shadow-lg shadow-black/10 transition hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Square size={17} />
                    Complete
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setConfirmAction("cancel")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-rose-200 ring-1 ring-rose-300/30 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <XCircle size={17} />
                    Cancel
                  </button>
                </div>
              </div>
            </section>

            {/* Details */}

            <aside className="space-y-4 lg:col-span-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                  Session Details
                </h2>

                <div className="mt-4 space-y-3">
                  <DetailRow
                    icon={User}
                    label="Farmer"
                    value={activeFarmerName}
                  />

                  <DetailRow
                    icon={MapPin}
                    label="Field / Location"
                    value={activeWork.fieldName || "-"}
                  />

                  <DetailRow
                    icon={Tractor}
                    label="Work Type"
                    value={activeWorkType}
                  />

                  <DetailRow
                    icon={IndianRupee}
                    label="Hourly Rate"
                    value={`${formatCurrency(activeRate)}/hr`}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-100">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-sky-600"
                />

                <p className="text-sm leading-relaxed text-sky-900">
                  When you complete this work, the farmer's available
                  advance is adjusted automatically. Pausing and
                  resuming updates the working duration accordingly.
                </p>
              </div>
            </aside>
          </div>
        ) : (

          /* ================= START NEW WORK ================= */

          <div className="grid gap-6 lg:grid-cols-5">

            <section className="overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 lg:col-span-3">

              <div className="flex items-center gap-4 border-b border-stone-100 bg-gradient-to-r from-emerald-50 to-white p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                  <Play size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-stone-900">
                    Start New Work
                  </h2>

                  <p className="mt-0.5 text-sm text-stone-500">
                    Pick a farmer and rate, then start the timer.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleStartWork}
                className="space-y-5 p-6"
              >

                {/* Voice Input */}

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    disabled={actionLoading}
                    className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition ${
                      voiceListening
                        ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                        : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {voiceListening ? (
                      <>
                        <MicOff
                          size={20}
                          className="animate-pulse"
                        />
                        Listening... Tap to Stop
                      </>
                    ) : (
                      <>
                        <Mic size={20} />
                        Fill Form Using Voice
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-center text-xs leading-relaxed text-stone-500">
                    Example: किसान गुलजार काम रोटावेटर खेत नॉर्थ फील्ड
                  </p>

                  <p className="mt-1 text-center text-[11px] text-stone-400">
                    Voice input supports Hindi and Hinglish.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">

                  {/* Farmer */}

                  <FormField
                    label="Farmer"
                    icon={User}
                  >
                    <select
                      value={timerForm.farmerId}
                      onChange={setField("farmerId")}
                      className={`${inputCls} appearance-none`}
                      required
                    >
                      <option value="">Choose a farmer</option>

                      {farmers.map((farmer) => (
                        <option
                          key={farmer._id}
                          value={farmer._id}
                        >
                          {getFarmerName(farmer)}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                  </FormField>

                  {/* Work Rate */}

                  <FormField
                    label="Work Rate"
                    icon={IndianRupee}
                  >
                    <select
                      value={timerForm.workRate}
                      onChange={setField("workRate")}
                      className={`${inputCls} appearance-none`}
                      required
                    >
                      <option value="">Choose a work rate</option>

                      {workRates.map((rate) => (
                        <option
                          key={rate._id}
                          value={rate._id}
                        >
                          {getRateName(rate)} —{" "}
                          {formatCurrency(getRateAmount(rate))}/hr
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                  </FormField>

                  {/* Field */}

                  <FormField
                    label="Field / Location"
                    icon={MapPin}
                  >
                    <input
                      type="text"
                      value={timerForm.fieldName}
                      onChange={setField("fieldName")}
                      placeholder="e.g. North field, Plot 2"
                      className={inputCls}
                      required
                    />
                  </FormField>

                  {/* Date */}

                  <FormField
                    label="Work Date"
                    icon={CalendarDays}
                  >
                    <input
                      type="date"
                      value={timerForm.date}
                      onChange={setField("date")}
                      className={inputCls}
                      required
                    />
                  </FormField>
                </div>

                {/* Submit */}

                <div className="border-t border-stone-100 pt-5">
                  <button
                    type="submit"
                    disabled={
                      actionLoading ||
                      !farmers.length ||
                      !workRates.length
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={18} />

                    {actionLoading
                      ? "Starting Work..."
                      : "Start Work Timer"}
                  </button>

                  {!farmers.length && (
                    <p className="mt-3 text-center text-xs font-medium text-rose-500">
                      No farmers found. Please add a farmer first.
                    </p>
                  )}

                  {farmers.length > 0 && !workRates.length && (
                    <p className="mt-3 text-center text-xs font-medium text-rose-500">
                      No work rates found. Please add a work rate first.
                    </p>
                  )}
                </div>
              </form>
            </section>

            {/* Preview side */}

            <aside className="space-y-4 lg:col-span-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${STATUS_STYLES.IDLE.pill}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    NO ACTIVE WORK
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                  <CheckCircle2
                    size={22}
                    className="shrink-0 text-emerald-600"
                  />

                  <div>
                    <p className="text-sm font-bold text-emerald-900">
                      Ready for a new session
                    </p>

                    <p className="text-xs text-emerald-700">
                      No running or paused work found.
                    </p>
                  </div>
                </div>

                <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-stone-400">
                  Session Preview
                </h3>

                <div className="space-y-3">
                  <DetailRow
                    icon={User}
                    label="Farmer"
                    value={
                      selectedFarmer
                        ? getFarmerName(selectedFarmer)
                        : "Not selected"
                    }
                    muted={!selectedFarmer}
                  />

                  <DetailRow
                    icon={Tractor}
                    label="Work Type"
                    value={
                      selectedRate
                        ? getRateName(selectedRate)
                        : "Not selected"
                    }
                    muted={!selectedRate}
                  />

                  <DetailRow
                    icon={IndianRupee}
                    label="Hourly Rate"
                    value={
                      selectedRate
                        ? `${formatCurrency(
                            getRateAmount(selectedRate)
                          )}/hr`
                        : "-"
                    }
                    muted={!selectedRate}
                  />
                </div>

                {selectedFarmer && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 p-4 text-white shadow-lg shadow-amber-500/20">
                    <div className="flex items-center gap-3">
                      <Wallet size={20} />

                      <div>
                        <p className="text-sm font-bold">
                          Available Advance
                        </p>

                        <p className="text-xs text-amber-50/90">
                          Auto-adjusted on completion
                        </p>
                      </div>
                    </div>

                    <p className="text-xl font-extrabold">
                      {formatCurrency(
                        selectedFarmer.advanceAmount || 0
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-xs leading-relaxed text-stone-500">
                  The timer tracks elapsed time automatically. Pause
                  whenever the tractor stops temporarily, and resume
                  when work continues.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Confirm dialog */}

      {confirmAction && (
        <ConfirmDialog
          kind={confirmAction}
          loading={actionLoading}
          onClose={() =>
            !actionLoading && setConfirmAction(null)
          }
          onConfirm={
            confirmAction === "stop"
              ? handleStop
              : handleCancel
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UI Components                                                       */
/* ------------------------------------------------------------------ */

function TimerRing({ seconds, running, children }) {
  const radius = 108;
  const circumference = 2 * Math.PI * radius;

  const progress = (seconds % 60) / 60;

  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
      <svg
        viewBox="0 0 240 240"
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-white/10"
        />

        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-1000 ease-linear ${
            running
              ? "stroke-emerald-400"
              : "stroke-amber-400"
          }`}
        />
      </svg>

      <div className="relative flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  );
}

function TimerStat({ label, value, highlight = false }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-center ring-1 ring-white/10">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/60">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-extrabold tabular-nums ${
          highlight ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, muted = false }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-400">
          {label}
        </p>

        <p
          className={`truncate text-sm font-bold ${
            muted ? "text-stone-400" : "text-stone-800"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function FormField({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-stone-700">
        {label}
      </span>

      <div className="relative">
        <Icon
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-stone-400"
        />

        {children}
      </div>
    </label>
  );
}

function ConfirmDialog({
  kind,
  loading,
  onClose,
  onConfirm,
}) {
  const isStop = kind === "stop";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            isStop
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-600"
          }`}
        >
          {isStop ? (
            <Hourglass size={22} />
          ) : (
            <XCircle size={22} />
          )}
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-stone-900">
          {isStop
            ? "Complete this work?"
            : "Cancel this work?"}
        </h3>

        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
          {isStop
            ? "The timer will stop and any available farmer advance will be adjusted automatically."
            : "This session will be cancelled. This action cannot be undone."}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
          >
            Keep working
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-50 ${
              isStop
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {loading
              ? "Please wait..."
              : isStop
              ? "Complete work"
              : "Cancel work"}
          </button>
        </div>
      </div>
    </div>
  );
}