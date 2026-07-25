import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/UI/PageHeader";
import StatCard from "../../components/UI/StateCard";
import Card from "../../components/UI/Card";
import { AlertCircle, Users, CheckCircle2, IndianRupee, Wallet } from "lucide-react";
import axios from "axios";
import { inr } from "../../data/mockData";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function DueSummary() {
  const [farmerRecords, setFarmerRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFarmerRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${API}/farmer/all-farmer`,
        {},
        { withCredentials: true }
      );
console.log(response.data)
      setFarmerRecords(response.data?.farmers || response.data.farmers || []);
    } catch (err) {
      console.error("Error fetching farmer records:", err);
      setError("Failed to load due summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerRecords();
  }, []);

  const dueRecords = useMemo(() => {
    return farmerRecords.filter((f) => Number(f.totalDueAmount || 0) > 0);
  }, [farmerRecords]);

  const totalOutstanding = useMemo(() => {
    return dueRecords.reduce((sum, f) => sum + Number(f.totalDueAmount || 0), 0);
  }, [dueRecords]);

  const totalCollected = useMemo(() => {
    return farmerRecords.reduce((sum, f) => sum + Number(f.totalPaidAmount || 0), 0);
  }, [farmerRecords]);

  const totalBilled = useMemo(() => {
    return farmerRecords.reduce((sum, f) => sum + Number(f.totalBilledAmount || 0), 0);
  }, [farmerRecords]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Due Summary"
        subtitle="Track outstanding balances across all farmers"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          Icon={AlertCircle}
          label="Total Outstanding Due"
          value={inr(totalOutstanding)}
          tone="red"
        />
        <StatCard
          Icon={Users}
          label="Farmers with Due"
          value={dueRecords.length}
          tone="amber"
        />
        <StatCard
          Icon={CheckCircle2}
          label="Fully Cleared"
          value={Math.max(farmerRecords.length - dueRecords.length, 0)}
          tone="green"
        />
        <StatCard
          Icon={Wallet}
          label="Total Collected"
          value={inr(totalCollected)}
          tone="emerald"
        />
      </div>

      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">
        <div className="bg-gradient-to-r from-red-50 via-white to-amber-50 px-5 py-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Due Farmers</h3>
              <p className="text-sm text-slate-500">
                Only farmers with pending dues are shown below
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600 border border-slate-200">
              <IndianRupee size={16} className="text-red-500" />
              <span>{inr(totalOutstanding)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-500">Loading due records...</div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchFarmerRecords}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          ) : dueRecords.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">No dues pending</h4>
              <p className="text-sm text-slate-500 mt-1">
                All farmers are fully cleared right now.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
                  <th className="py-3.5 px-5 font-medium">Farmer</th>
                  <th className="py-3.5 px-5 font-medium">Phone</th>
                  <th className="py-3.5 px-5 font-medium">Village</th>
                  <th className="py-3.5 px-5 font-medium">Total Amount</th>
                  <th className="py-3.5 px-5 font-medium">Paid</th>
                  <th className="py-3.5 px-5 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {dueRecords.map((f) => {
                  const due = Number(f.totalDueAmount || 0);
                  const total = Number(f.totalBilledAmount || 0);
                  const paid = Number(f.totalPaidAmount || 0);

                  return (
                    <tr
                      key={f._id}
                      className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-medium text-slate-800">
                        {f.name || "Unknown"}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{f.phone || "-"}</td>
                      <td className="py-3.5 px-5 text-slate-500">{f.village || "-"}</td>
                      <td className="py-3.5 px-5 text-slate-700">{inr(total)}</td>
                      <td className="py-3.5 px-5 text-emerald-600">{inr(paid)}</td>
                      <td className="py-3.5 px-5 font-semibold text-red-600">
                        {inr(due)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}