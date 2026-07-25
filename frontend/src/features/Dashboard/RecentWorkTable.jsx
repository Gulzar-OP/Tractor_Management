import React from "react";
import Card from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import { useNavigate } from "react-router-dom";

export default function RecentWorkTable({ records = [], inr }) {
  const navigate = useNavigate();
  return (
    <Card className="p-6 xl:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Recent Work Records</h3>
        <button
          onClick={() => navigate("/workRecords")}
          className="text-xs font-semibold text-green-600 flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer"
        >
          View all
        </button>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-2 pb-3 font-medium">Farmer</th>
              <th className="px-2 pb-3 font-medium">Field</th>
              <th className="px-2 pb-3 font-medium">Work</th>
              <th className="px-2 pb-3 font-medium">Amount</th>
              <th className="px-2 pb-3 font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {records.slice().slice(0, 5).map((w, index) => (
              <tr
                key={w._id || index}
                onClick={() => navigate(`/farmers/${w?.farmer?._id}`)}
                className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="px-2 py-3 font-medium text-slate-800">
                  {w.farmer?.name || "Unknown"}
                </td>
                <td className="px-2 py-3 font-medium text-slate-800">
                  {w.fieldName || "Unknown"}
                </td>
                <td className="px-2 py-3 text-slate-500">
                  {w.workType || "-"}
                </td>
                <td className="px-2 py-3 text-slate-700">
                  {inr(w.totalAmount || 0)}
                </td>
                <td className="px-2 py-3">
                  <Badge status={w.paymentStatus || "Due"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}