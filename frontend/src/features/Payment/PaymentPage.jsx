import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { IndianRupee, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Field from "../../components/UI/Field";
import PrimaryButton from "../../components/UI/PrimaryButton";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK"];
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = location.state || {};

  const [farmers, setFarmers] = useState([]);
  const [works, setWorks] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [loadingWorks, setLoadingWorks] = useState(false);

  const [farmerId, setFarmerId] = useState(incoming.farmerID || "");
  const [workId, setWorkId] = useState(incoming.workId || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        setLoadingFarmers(true);
        const res = await axios.post(
          `${API}/farmer/all-farmer`,
          {},
          { withCredentials: true }
        );
        const list = res.data?.farmers || res.data || [];
        setFarmers(list);
        if (!farmerId && list.length) setFarmerId(list[0]._id);
      } catch (e) {
        console.log(e);
        setToast({ type: "error", message: "Could not load farmers list" });
      } finally {
        setLoadingFarmers(false);
      }
    };
    fetchFarmers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!farmerId) {
      setWorks([]);
      return;
    }
    const fetchWorks = async () => {
      try {
        setLoadingWorks(true);
        const res = await axios.get(`${API}/farmer/${farmerId}`, {
          withCredentials: true,
        });
        const farmerData = res.data?.farmer || res.data;
        const allWorks = farmerData?.works || [];
        const dueWorks = allWorks.filter((w) => Number(w.dueAmount || 0) > 0);
        setWorks(dueWorks);

        if (incoming.workId && dueWorks.some((w) => w._id === incoming.workId)) {
          setWorkId(incoming.workId);
        } else if (!dueWorks.some((w) => w._id === workId)) {
          setWorkId(dueWorks[0]?._id || "");
        }
      } catch (e) {
        console.log(e);
        setToast({ type: "error", message: "Could not load work records" });
      } finally {
        setLoadingWorks(false);
      }
    };
    fetchWorks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const selectedWork = useMemo(
    () => works.find((w) => w._id === workId) || null,
    [works, workId]
  );

  const dueAmount = Number(selectedWork?.dueAmount ?? 0);
  const numericAmount = Number(amount);
  const amountInvalid =
    amount !== "" && (!Number.isFinite(numericAmount) || numericAmount <= 0);
  const exceedsDue = selectedWork && numericAmount > dueAmount;

  const canSubmit =
    farmerId &&
    workId &&
    amount !== "" &&
    !amountInvalid &&
    !exceedsDue &&
    paymentMethod &&
    !submitting;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setToast(null);

      const driverID =
        selectedWork?.createdBy ||
        incoming.driverID ||
        farmers.find((f) => f._id === farmerId)?.createdBy;

      if (!driverID) {
        setToast({ type: "error", message: "Could not determine driver for this work" });
        setSubmitting(false);
        return;
      }

      const res = await axios.post(
        `${API}/payment`,
        {
          driverID,
          workId,
          amount: numericAmount,
          paymentMethod,
          note,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setToast({ type: "success", message: "Payment saved successfully" });
        setAmount("");
        setNote("");

        const refreshed = await axios.get(`${API}/farmer/${farmerId}`, {
          withCredentials: true,
        });
        const farmerData = refreshed.data?.farmer || refreshed.data;
        const dueWorks = (farmerData?.works || []).filter((w) => Number(w.dueAmount || 0) > 0);
        setWorks(dueWorks);
        setWorkId(dueWorks[0]?._id || "");
      } else {
        setToast({ type: "error", message: res.data?.message || "Payment failed" });
      }
    } catch (err) {
      const message = err.response?.data?.message || "Something went wrong while saving payment";
      setToast({ type: "error", message });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Add Payment" subtitle="Record a new payment entry" />

        <Card className="mt-6 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          {incoming.farmerName && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} />
              Recording payment for <span className="font-semibold">{incoming.farmerName}</span>
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Farmer">
              <select
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                disabled={loadingFarmers}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                {loadingFarmers && <option>Loading...</option>}
                {!loadingFarmers && farmers.length === 0 && <option value="">No farmers found</option>}
                {farmers.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Work (with due balance)">
              <select
                value={workId}
                onChange={(e) => setWorkId(e.target.value)}
                disabled={loadingWorks || works.length === 0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                {loadingWorks && <option>Loading...</option>}
                {!loadingWorks && works.length === 0 && (
                  <option value="">No due works for this farmer</option>
                )}
                {works.map((w) => (
                  <option key={w._id} value={w._id}>
                    {(w.workType || w.type || "Work")} — Due ₹{Number(w.dueAmount || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </Field>

            {selectedWork && (
              <div className="sm:col-span-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">Amount due for this work</span>
                <span className="flex items-center gap-1 font-semibold text-rose-600">
                  <IndianRupee size={14} />
                  {dueAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <Field label="Amount">
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to pay"
                className={`w-full rounded-2xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-4 ${
                  amountInvalid || exceedsDue
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                }`}
              />
              {amountInvalid && (
                <p className="mt-1 text-xs text-rose-600">Enter a valid amount greater than 0</p>
              )}
              {exceedsDue && !amountInvalid && (
                <p className="mt-1 text-xs text-rose-600">
                  Amount exceeds due balance of ₹{dueAmount.toLocaleString("en-IN")}
                </p>
              )}
            </Field>

            <Field label="Method">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes (optional)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </Field>

            <div className="sm:col-span-2 flex items-center gap-3">
              <PrimaryButton type="submit" disabled={!canSubmit} className="flex items-center gap-2">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Saving..." : "Save Payment"}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>

      {toast && (
        <div
          className={`toast fixed bottom-8 right-8 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}