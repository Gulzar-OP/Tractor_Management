import axios from "axios";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaTractor,
  FaCheckCircle,
  FaExclamationCircle,
  FaRupeeSign,
  FaUsers,
} from "react-icons/fa";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api`;

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const features = [
  { icon: FaUsers, text: "Apne drivers aur kisano ko ek jagah sambhalo" },
  { icon: FaTractor, text: "Har kaam ka time aur rate automatic calculate" },
  { icon: FaRupeeSign, text: "Baaki rakam aur kharcha ek nazar me" },
];

// Password ki strength: 0 se 4 tak
const getStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

const strengthMeta = [
  { label: "Bahut kamzor", color: "bg-red-500", text: "text-red-500" },
  { label: "Kamzor", color: "bg-orange-500", text: "text-orange-500" },
  { label: "Theek hai", color: "bg-yellow-500", text: "text-yellow-600" },
  { label: "Achha", color: "bg-green-500", text: "text-green-600" },
  { label: "Bahut badhiya", color: "bg-emerald-600", text: "text-emerald-600" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100";

export default function Register() {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Page chhodne pe pending redirect cancel karo (memory leak / galat navigate se bachne ke liye)
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const strength = useMemo(
    () => getStrength(formData.password),
    [formData.password]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validate = ({ name, email, password, confirmPassword }) => {
    if (!name) return "Naam daalna zaroori hai";
    if (!EMAIL_REGEX.test(email)) return "Sahi email daalo";
    if (password.length < 8)
      return "Password kam se kam 8 characters ka hona chahiye";
    if (password.length > 72)
      return "Password 72 characters se zyada nahi ho sakta";
    if (password !== confirmPassword) return "Dono password match nahi kar rahe";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || done) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    const validationError = validate({
      ...payload,
      confirmPassword: formData.confirmPassword,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await axios.post(`${API}/auth/register`, payload);

      setSuccess(res.data?.message || "Registration successful");
      setDone(true);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });

      // Approval wala message padhne ka waqt do
      redirectTimer.current = setTimeout(
        () => navigate("/login"),
        res.data?.pendingApproval ? 5000 : 1500
      );
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || "Registration failed");
      } else {
        setError("Server se connect nahi ho paya. Internet ya server check karo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;
  const passwordsMismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* ---------- Left: brand panel (sirf desktop pe) ---------- */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-12 text-white">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <FaTractor className="text-2xl" />
          </div>
          <span className="text-xl font-semibold tracking-wide">
            Tractor Manager
          </span>
        </div>

        <div className="relative space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold leading-tight">
              Shuru karo,
              <br />
              2 minute me account ready.
            </h1>
            <p className="mt-3 max-w-md text-white/80">
              Ek baar register karo, phir drivers, kisan aur kaam ka poora
              hisaab apne haath me.
            </p>
          </motion.div>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon />
                </span>
                <span className="text-white/90">{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Tractor Manager
        </p>
      </div>

      {/* ---------- Right: form ---------- */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-white">
              <FaTractor className="text-xl" />
            </div>
            <span className="text-lg font-semibold text-slate-800">
              Tractor Manager
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-800">
              Naya account banao
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Owner account ke liye apni details bharo
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Poora naam
                </label>
                <div className="relative">
                  <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ramesh Yadav"
                    autoComplete="name"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <div className="relative">
                  <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="aap@example.com"
                    autoComplete="email"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Kam se kam 8 characters"
                    autoComplete="new-password"
                    maxLength={72}
                    className={`${inputClass} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Password chhupao" : "Password dikhao"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Strength meter */}
                {formData.password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i < strength
                              ? strengthMeta[strength].color
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`mt-1 text-xs font-medium ${strengthMeta[strength].text}`}
                    >
                      {strengthMeta[strength].label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password dobara daalo
                </label>
                <div className="relative">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Wahi password phir se"
                    autoComplete="new-password"
                    maxLength={72}
                    className={`${inputClass} ${
                      passwordsMismatch
                        ? "!border-red-400 focus:!ring-red-100"
                        : ""
                    }`}
                    required
                  />
                </div>
                {passwordsMatch && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                    <FaCheckCircle /> Password match ho gaya
                  </p>
                )}
                {passwordsMismatch && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    Password match nahi kar raha
                  </p>
                )}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                    role="alert"
                  >
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                      <FaExclamationCircle className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                    role="status"
                  >
                    <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                      <FaCheckCircle className="mt-0.5 shrink-0" />
                      <span>{success}. Login page pe bhej rahe hain...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: loading || done ? 1 : 1.01 }}
                whileTap={{ scale: loading || done ? 1 : 0.98 }}
                disabled={loading || done}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Account ban raha hai...
                  </>
                ) : done ? (
                  "Ho gaya!"
                ) : (
                  "Account banao"
                )}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Pehle se account hai?{" "}
              <Link
                to="/login"
                className="font-medium text-green-600 hover:text-green-700 hover:underline"
              >
                Sign in karo
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Driver ho? Apne owner se account banwao.
          </p>
        </motion.div>
      </div>
    </div>
  );
}