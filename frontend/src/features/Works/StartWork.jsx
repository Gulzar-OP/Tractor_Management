import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import PrimaryButton from "../../components/UI/PrimaryButton";
import { FARMERS, WORKTYPES, WORKRATESDEFAULT, inr } from "../../data/mockData";
import { Play, Pause, RotateCcw, Save, Circle } from "lucide-react";

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, "0")).join(":");
}

function getToday() {
  const d = new Date();
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export default function StartWork() {
  const [farmerId, setFarmerId] = useState(FARMERS[0]?.id || "");
  const [type, setType] = useState(WORKTYPES[0] || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState(false);

  const farmer = FARMERS.find(f => f.id === farmerId);
  const rate = WORKRATESDEFAULT.find(r => r.type === type)?.rate || 0;
  const amount = useMemo(() => ((elapsed / 1000) / 3600) * rate, [elapsed, rate]);

  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(() => {
        setElapsed(prev => prev + 1000);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);
  // useEffect(() =>{
  //   const fetchData = async() =>{
  //     try{
  //       const res = await fetch(`/api/works/${workId}`);
  //       const data = await res.json();
  //       setWork(data);
  //     }catch(err){
  //       console.error(err);
  //     }
  //   }
  //   fetchData();
  // }, [])
  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  function handleStartPauseResume() {
    setIsRunning(prev => !prev);
  }

  function handleReset() {
    setIsRunning(false);
    setElapsed(0);
  }

  const actionLabel = isRunning ? "Pause" : elapsed > 0 ? "Resume" : "Start";
    const ActionIcon = isRunning ? Pause : Play;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Start Work"
        subtitle="Track live work time with a stopwatch"
      />

      <Card className="p-4 sm:p-6 max-w-6xl mx-auto bg-gradient-to-br from-white via-slate-50 to-green-50/40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-5">
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{getToday()}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Farmer</label>
                <select
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                >
                  {FARMERS.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} - {f.village}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                >
                  {WORKTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartPauseResume}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm ${
                    isRunning
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  <ActionIcon size={16} />
                  {actionLabel}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all duration-200"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>

              <PrimaryButton type="submit" icon={Save} className="w-full justify-center">
                Save Work
              </PrimaryButton>
            </form>
          </div>

          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="w-full min-h-[460px] rounded-[2rem] bg-slate-950 text-white relative overflow-hidden shadow-2xl border border-slate-800">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.20),transparent_55%)]" />
              <div className="absolute top-6 left-6 flex items-center gap-2 text-xs text-green-300">
                <Circle size={10} className={isRunning ? "animate-pulse fill-green-400 text-green-400" : "text-slate-500"} />
                {isRunning ? "Running" : elapsed > 0 ? "Paused" : "Ready"}
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center min-h-[460px] px-6 text-center">
                <p className="text-sm text-slate-400 mb-3">Stopwatch</p>

                <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/10 bg-white/5 backdrop-blur-md" />
                  <div className="absolute inset-6 rounded-full border border-white/10" />
                  <div className="absolute inset-10 rounded-full bg-gradient-to-b from-white/5 to-white/0" />

                  <div className="relative z-10">
                    <div className="text-4xl sm:text-6xl font-bold tracking-tight">
                      {formatTime(elapsed)}
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      Rate ₹{rate}/hour • Amount{" "}
                      <span className="font-semibold text-green-400">{inr(amount)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                  <button
                    type="button"
                    onClick={handleStartPauseResume}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                      isRunning
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    <ActionIcon size={16} />
                    {actionLabel}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm bg-white/10 text-white border border-white/15 hover:bg-white/15 transition-all duration-200"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-slate-400">Farmer</p>
                    <p className="mt-1 text-sm font-semibold text-white">{farmer?.name || "-"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-slate-400">Work Type</p>
                    <p className="mt-1 text-sm font-semibold text-white">{type}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-slate-400">Date</p>
                    <p className="mt-1 text-sm font-semibold text-white">{date}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {saved && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
          Work saved successfully
        </div>
      )}
    </div>
  );
}