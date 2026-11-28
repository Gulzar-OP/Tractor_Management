import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash, FaTractor, FaExclamationCircle } from "react-icons/fa";
import toast from "react-hot-toast";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password kam se kam 8 characters ka rakho");
    if (password.length > 72) return setError("Password 72 characters se chhota rakho");
    if (password !== confirm) return setError("Dono password same hone chahiye");

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/auth/reset-password/${token}`, { password });
      toast.success("Password badal gaya. Ab login karo.");
      navigate("/login", { replace: true });
    } catch (err) {
      if (err.response?.status === 400 && /expire|galat/i.test(err.response?.data?.message || "")) {
        setExpired(true);
      }
      setError(err.response?.data?.message || "Kuch gadbad hui. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white">
            <FaTractor />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Naya password set karo</h1>
            <p className="text-sm text-slate-500">Kam se kam 8 characters</p>
          </div>
        </div>

        {expired ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm text-red-600">
              <FaExclamationCircle /> {error}
            </p>
            <Link
              to="/forgot-password"
              className="block w-full rounded-xl bg-green-600 py-3 text-center font-semibold text-white hover:bg-green-700"
            >
              Naya link mangao
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Naya password"
                autoComplete="new-password"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label="Password dikhao/chhupao"
              >
                {show ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Password dobara daalo"
                autoComplete="new-password"
                className={inputClass}
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
              {loading ? "Save ho raha hai..." : "Password badlo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
