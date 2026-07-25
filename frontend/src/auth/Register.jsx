import axios from "axios";
import React, { useState } from "react";
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const register = async (data) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await axios.post(
        `${API}/auth/register`,
        data,
        { withCredentials: true }
      );
      console.log(formData)

      setSuccess(res.data?.message || "Registered successfully");
      setFormData({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await register(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4"
      >
        <h2 className="text-2xl font-semibold text-slate-800">Register</h2>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            {success}
          </p>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter name"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-green-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-green-600 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}