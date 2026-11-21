import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FaTractor, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

const MODEL_SUGGESTIONS = [
  "Mahindra 575 DI",
  "Mahindra 475 DI",
  "Mahindra 265 DI",
  "Swaraj 744 FE",
  "Swaraj 735 FE",
  "John Deere 5050 D",
  "Sonalika DI 750 III",
  "Massey Ferguson 241 DI",
  "New Holland 3630",
  "Eicher 380",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100";

export default function TractorDetailsForm() {
  const { user } = useSelector((state) => state.auth);

  const isOwner = user?.role === "owner";

  const [model, setModel] = useState("");
  const [number, setNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch tractor details only when owner is logged in
  useEffect(() => {
    if (!user || !isOwner) return;

    let cancelled = false;

    const loadTractorDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get(`${API}/tractor/status`, {
          withCredentials: true,
        });

        if (cancelled) return;

        const tractor = res.data?.tractor || res.data?.data || {};

        setModel(tractor.model || "");
        setNumber(tractor.number || "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Tractor details load nahi ho payi"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTractorDetails();

    return () => {
      cancelled = true;
    };
  }, [user, isOwner]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    const payload = {
      model: model.trim(),
      number: number.trim().toUpperCase(),
    };

    if (!payload.model) {
      setError("Tractor ka model daalo");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await axios.patch(
        `${API}/tractor/details`,
        payload,
        {
          withCredentials: true,
        }
      );

      const tractor = res.data?.tractor;

      if (tractor) {
        setModel(tractor.model || "");
        setNumber(tractor.number || "");
      }

      setSuccess(res.data?.message || "Tractor details save ho gayi!");

      // Sidebar ko refresh signal
      window.dispatchEvent(new Event("tractor-updated"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Save nahi ho paya. Internet ya server check karo."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
          <FaTractor />
        </span>

        <div>
          <h3 className="font-semibold text-slate-800">
            Tractor ki detail
          </h3>

          <p className="text-xs text-slate-500">
            Sidebar ke Tractor Status mein dikhegi
          </p>
        </div>
      </div>

      {/* Authentication check */}
      {!user ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          User information load ho rahi hai...
        </p>
      ) : !isOwner ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Tractor ki detail sirf owner badal sakta hai.
        </p>
      ) : loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
          noValidate
        >

          {/* Tractor Model */}
          <div>
            <label
              htmlFor="tractor-model"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tractor ka model
            </label>

            <input
              id="tractor-model"
              list="tractor-models"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setSuccess("");
              }}
              maxLength={80}
              placeholder="Jaise: Mahindra 575 DI"
              className={inputClass}
              required
            />

            <datalist id="tractor-models">
              {MODEL_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* Tractor Number */}
          <div>
            <label
              htmlFor="tractor-number"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tractor number{" "}
              <span className="text-slate-400">(optional)</span>
            </label>

            <input
              id="tractor-number"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value.toUpperCase());
                setSuccess("");
              }}
              maxLength={20}
              placeholder="Jaise: WB 12 AB 3456"
              className={inputClass}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
            >
              <FaExclamationCircle className="mt-0.5 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
            >
              <FaCheckCircle className="mt-0.5 shrink-0" />

              <span>{success}</span>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Save ho raha hai...
              </>
            ) : (
              "Save karo"
            )}
          </button>
        </form>
      )}
    </div>
  );
}