import React, { useState } from "react";
import PageHeader from "../../components/UI/PageHeader";
import GhostButton from "../../components/UI/GhostButton";
import StatCard from "../../components/UI/StateCard";
import Card from "../../components/UI/Card";
import { FileText, FileSpreadsheet, TrendingUp, Receipt, IndianRupee } from "lucide-react";
import { MONTHLYINCOME, WORKTYPES, WORKRECORDS, FARMERS, inr } from "../../data/mockData";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import axios from "axios";
import { useEffect } from "react";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function Reports() {
  const [range, setRange] = useState("Monthly");

  const [farmer, setFarmer] = useState([]);
  const [income , setIncome] = useState([]);
  const [expense, setExpense] = useState([]);

  const workTypeData = WORKTYPES.map(t => {
    const recs = WORKRECORDS.filter(w => w.type === t);
    return { name: t, value: recs.reduce((s,r) => s + r.amount, 0) };
  }).filter(d => d.value > 0);

  const fetchFarmer = async() =>{
    try{
      const res = await axios.post(`${API}/farmer/all-farmer`)
      console.log(res.data.all)
      setFarmer(res.data.all)
    }
    catch(e){

    }
  }
    const fetchIncome = async() =>{
    try{
      const res = await axios.post(`${API}/work/all-works`)
      // console.log("fetch income",res.data)
      setIncome(res.data)
      // setFarmer(res.data.all)
    }
    catch(e){

    }
  }
      const fetchExpenses = async() =>{
    try{
      const res = await axios.get(`${API}/expenses/all-expenses`)
      // console.log("fetch expense",res.data.expenses)
      setExpense(res.data.expenses)
      // setFarmer(res.data.all)
    }
    catch(e){

    }
  }
  
  useEffect(()=>{
    fetchFarmer();
    fetchExpenses();
    fetchIncome();
  },[])
  const totalIncome = MONTHLYINCOME.reduce((s,m) => s + m.income, 0);
  const totalExpense = MONTHLYINCOME.reduce((s,m) => s + m.expense, 0);
  const netProfit = totalIncome - totalExpense;

  const farmerRevenue = farmer.map(f => ({ name: f.name.split(" ")[0], value: f.totalBilledAmount })).sort((a,b) => b.value - a.value).slice(0,6);
  const colors = ["#16A34A","#0F172A","#4ADE80","#86EFAC","#166534","#94A3B8","#22C55E"];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analyze income, expenses and profitability" action={<div className="flex gap-2"><GhostButton icon={FileText}>Export PDF</GhostButton><GhostButton icon={FileSpreadsheet}>Export Excel</GhostButton></div>} />

      <div className="flex gap-2 mb-6">
        {["Daily","Weekly","Monthly","Yearly"].map(r => (
          <button key={r} onClick={() => setRange(r)} className={`px-4 py-2 rounded-2xl text-sm font-medium border ${r === range ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-500 border-slate-200"}`}>{r}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard Icon={TrendingUp} label="Total Income" value={inr(totalIncome)} tone="green" />
        <StatCard Icon={Receipt} label="Total Expenses" value={inr(totalExpense)} tone="red" />
        <StatCard Icon={IndianRupee} label="Net Profit" value={inr(netProfit)} tone="dark" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Income vs Expense</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={MONTHLYINCOME}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 16, border: "1px solid #f1f5f9" }} />
                <Legend />
                <Bar dataKey="income" fill="#16A34A" name="Income" radius={[8,8,0,0]} />
                <Bar dataKey="expense" fill="#0F172A" name="Expense" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Work Type Distribution</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={workTypeData} dataKey="value" nameKey="name" outerRadius={95} label>
                  {workTypeData.map((d,i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Farmer Wise Revenue</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={farmerRevenue} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 16, border: "1px solid #f1f5f9" }} />
              <Bar dataKey="value" fill="#16A34A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}