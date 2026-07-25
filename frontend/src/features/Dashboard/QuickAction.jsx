import React from "react";
import Card from "../../components/UI/Card";
import { Users, Tractor, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function QuickActions() {
  const navigate = useNavigate();
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Quick Actions</h3>
      </div>

      <div className="space-y-3">
        <button onClick={() => navigate("/farmers/addFarmer")} className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-green-50 text-left group">
          <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-green-600 flex items-center justify-center shadow-sm"><Users size={16} className="text-green-600 group-hover:text-white" /></div>
          <span className="text-sm font-medium text-slate-700">Add Farmer</span>
        </button>

        <button onClick={() => navigate("works/start")} className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-green-50 text-left group">
          <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-green-600 flex items-center justify-center shadow-sm"><Tractor size={16} className="text-green-600 group-hover:text-white" /></div>
          <span className="text-sm font-medium text-slate-700">Start Work</span>
        </button>

        <button onClick={() => navigate("payments")} className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-green-50 text-left group">
          <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-green-600 flex items-center justify-center shadow-sm"><Wallet size={16} className="text-green-600 group-hover:text-white" /></div>
          <span className="text-sm font-medium text-slate-700">Add Payment</span>
        </button>
      </div>
    </Card>
  );
}