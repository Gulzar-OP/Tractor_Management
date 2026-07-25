import React from "react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import { WORKRECORDS, inr } from "../../data/mockData";

export default function WorkRecordDetails({ recordId = "W101", navigate }) {
  const record = WORKRECORDS.find(w => w.id === recordId) || WORKRECORDS[0];

  return (
    <div>
      <PageHeader
        title="Work Record Details"
        subtitle="Detailed view of a tractor work record"
        action={<button onClick={() => navigate("workRecords")} className="px-4 py-2 rounded-xl border">Back</button>}
      />

      <Card className="p-6 max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><p className="text-xs text-slate-400">Record ID</p><p className="font-semibold">{record.id}</p></div>
          <div><p className="text-xs text-slate-400">Farmer</p><p className="font-semibold">{record.farmer}</p></div>
          <div><p className="text-xs text-slate-400">Date</p><p className="font-semibold">{record.date}</p></div>
          <div><p className="text-xs text-slate-400">Type</p><p className="font-semibold">{record.type}</p></div>
          <div><p className="text-xs text-slate-400">Hours</p><p className="font-semibold">{record.hours}</p></div>
          <div><p className="text-xs text-slate-400">Rate</p><p className="font-semibold">{inr(record.rate)}</p></div>
          <div><p className="text-xs text-slate-400">Amount</p><p className="font-semibold">{inr(record.amount)}</p></div>
          <div><p className="text-xs text-slate-400">Paid</p><p className="font-semibold text-green-600">{inr(record.paid)}</p></div>
          <div><p className="text-xs text-slate-400">Due</p><p className="font-semibold text-red-600">{inr(record.due)}</p></div>
          <div><p className="text-xs text-slate-400">Status</p><Badge status={record.status} /></div>
        </div>
      </Card>
    </div>
  );
}