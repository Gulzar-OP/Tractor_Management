import React from "react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import { PAYMENTS, inr } from "../../data/mockData";

export default function PaymentHistory() {
  return (
    <div>
      <PageHeader title="Payment History" subtitle="All payment transactions in one place" />
      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-700px">
            <thead>
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="py-3.5 font-medium">Farmer</th>
                <th className="py-3.5 font-medium">Work</th>
                <th className="py-3.5 font-medium">Amount</th>
                <th className="py-3.5 font-medium">Method</th>
                <th className="py-3.5 font-medium">Date</th>
                <th className="py-3.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENTS.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 font-medium text-slate-800">{p.farmer}</td>
                  <td className="py-3.5 text-slate-500">{p.work}</td>
                  <td className="py-3.5 text-green-600 font-semibold">{inr(p.amount)}</td>
                  <td className="py-3.5 text-slate-500">{p.method}</td>
                  <td className="py-3.5 text-slate-500">{p.date}</td>
                  <td className="py-3.5 text-slate-400">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}