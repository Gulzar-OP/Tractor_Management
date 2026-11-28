import axios from "axios";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaTractor, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Sahi email daalo");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/auth/forgot-password`, { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.status === 429
          ? "Bahut zyada koshish. Thodi der baad try karo."
          : err.response?.data?.message || "Kuch gadbad hui. Dobara try karo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white">
            <FaTractor />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Password bhool gaye?</h1>
            <p className="text-sm text-slate-500">Email daalo, reset link bhej denge</p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl bg-green-50 p-4 text-green-800">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <FaCheckCircle /> Link bhej diya
            </div>
            <p className="text-sm">
              Agar <b>{email}</b> registered hai to reset link aapke inbox me aayega (spam bhi dekho).
              Link 30 minute tak chalega.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <FaExclamationCircle /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Bhej rahe hain..." : "Reset link bhejo"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-green-600 hover:underline">
            ← Login par wapas jao
          </Link>
        </p>
      </div>
    </div>
  );
}
