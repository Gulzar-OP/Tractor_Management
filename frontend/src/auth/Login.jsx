import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { getCurrentUser } from "../redux/slice/authSlice";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
console.log(API_BASE)

const API = `${API_BASE}/api`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      // The login call only sets the auth cookie — it doesn't put the user
      // in Redux. Without this, every screen that reads `state.auth.user`
      // (Topbar, Dashboard, Farmers...) stays stuck on "logged out" until
      // something else happens to remount and re-fetch it, e.g. a refresh.
      // Fetch and wait for it here so the store is populated before we
      // navigate away.
      await dispatch(getCurrentUser()).unwrap();

      navigate("/");
    } catch (err) {
      // unwrap() throws the rejectWithValue payload (a string) for a failed
      // getCurrentUser; axios errors carry a response object instead.
      const message =
        err?.response?.data?.message ||
        (typeof err === "string" ? err : null) ||
        "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/20 backdrop-blur-xl shadow-2xl rounded-3xl p-8 max-w-md w-full border border-white/30"
      >
        <motion.h2
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold text-white text-center mb-2"
        >
          Welcome Back
        </motion.h2>
        <p className="text-white/80 text-center mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <label htmlFor="email" className="text-white font-medium flex items-center gap-2">
              <FaEnvelope className="text-sm" />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
              placeholder="Enter your email"
            />
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <label htmlFor="password" className="text-white font-medium flex items-center gap-2">
              <FaLock className="text-sm" />
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
              placeholder="Enter your password"
            />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-200 bg-red-500/20 p-3 rounded-xl text-sm"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/70 text-center mt-6 text-sm"
        >
          Don't have an account?{" "}
          <a href="/register" className="text-indigo-200 hover:text-white font-medium underline">
            Sign up
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}