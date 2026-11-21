import React from "react";
import {
  Fuel,
  Wrench,
  Users,
  MapPin,
  ClipboardList,
  FileText,
  ArrowRight,
  Gauge,
} from "lucide-react";

const soilDark = "#0a0d0a";
const soilMid = "#161c16";
const paper = "#f7f7f4";
const paper2 = "#e9e9e4";
const rust = "#2f6b3a";
const rustDark = "#132b16";
const gold = "#7ed957";
const textMuted = "#8f9a8c";
const green = "#4a7c4a";

const features = [
  {
    icon: FileText,
    title: "Tractor profile",
    body: "Model, registration number, purchase date and documents — all saved in one place.",
  },
  {
    icon: Wrench,
    title: "Service reminders",
    body: "Oil changes, filters, tyres — get an alert before the next service is due.",
  },
  {
    icon: Fuel,
    title: "Fuel & expense log",
    body: "Log every refuel and cost, and see a clear summary at the end of the month.",
  },
  {
    icon: Users,
    title: "Driver management",
    body: "Track which driver is working which tractor, and when.",
  },
  {
    icon: ClipboardList,
    title: "Field work history",
    body: "Ploughing, sowing, harvesting — every job logged with a date and a record you can look back on.",
  },
  {
    icon: MapPin,
    title: "Location tracking",
    body: "See where a tractor is right now, straight from your phone.",
  },
];

const steps = [
  {
    n: "1",
    title: "Create an account",
    body: "Sign up free with your mobile number in under a minute.",
  },
  {
    n: "2",
    title: "Add your tractor",
    body: "Enter the model and number — your dashboard builds itself.",
  },
  {
    n: "3",
    title: "Set your reminders",
    body: "Add service and document dates, and let alerts do the remembering.",
  },
  {
    n: "4",
    title: "Log the day-to-day",
    body: "Fuel, work, expenses — record it as it happens.",
  },
];

const stats = [
  { n: "100%", l: "free to start" },
  { n: "2 min", l: "to finish setup" },
  { n: "24×7", l: "access from your phone" },
  { n: "3", l: "reminders set up on average" },
];

function Gauges() {
  const rings = [
    { stroke: green, val: "72%", label: "Fuel level", delay: "0s" },
    { stroke: rust, val: "318", label: "Engine hours", delay: "0.3s" },
    { stroke: gold, val: "6 days", label: "Next service", delay: "0.6s" },
  ];
  return (
    <div className="flex justify-between gap-3">
      {rings.map((r, i) => (
        <div key={i} className="flex-1 text-center">
          <svg width="72" height="42" viewBox="0 0 120 70" className="mx-auto">
            <path
              d="M10 60 A50 50 0 0 1 110 60"
              stroke={r.stroke}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              opacity="0.35"
            />
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="18"
              stroke={gold}
              strokeWidth="4"
              strokeLinecap="round"
              className="needle-sweep"
              style={{ transformOrigin: "60px 60px", animationDelay: r.delay }}
            />
            <circle cx="60" cy="60" r="5" fill={gold} />
          </svg>
          <div className="font-mono text-sm mt-1" style={{ color: gold }}>
            {r.val}
          </div>
          <div className="text-xs mt-0.5" style={{ color: textMuted }}>
            {r.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TractorIntro() {
  return (
    <div
      className="w-full h-screen font-sans"
      style={{ backgroundColor: soilDark, color: paper }}
    >
      <style>{`
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rise-in { animation: riseIn 0.7s ease both; }
        @keyframes needleSweep {
          0%, 100% { transform: rotate(-35deg); }
          50% { transform: rotate(35deg); }
        }
        .needle-sweep { animation: needleSweep 3s ease-in-out infinite; }
      `}</style>

      {/* NAV */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ backgroundColor: "rgba(36,26,18,0.9)", borderColor: "rgba(243,234,214,0.08)" }}
      >
        <div className="max-w-6xl mx-auto px-7 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge size={22} color={gold} strokeWidth={1.6} />
            <span className="text-2xl font-semibold tracking-wide" style={{ color: paper }}>
              Tractor Management
            </span>
          </div>
          <a
            href="#start"
            className="px-5 py-2 rounded text-sm font-medium border transition-transform hover:-translate-y-0.5"
            style={{ borderColor: gold, color: gold }}
          >
            Log in
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header className="pt-16 pb-20 min-h-[640px] flex items-center" style={{ backgroundColor: soilDark }}>
        <div className="max-w-6xl mx-auto px-7 grid grid-cols-1 md:grid-cols-2 gap-10 items-center w-full">
          <div>
            <div
              className="rise-in inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase mb-4"
              style={{ color: rust }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: rust }} />
              Welcome, new farmer
            </div>
            <h1
              className="rise-in text-5xl md:text-7xl font-extrabold tracking-tight leading-none"
              style={{ animationDelay: "0.15s", color: paper }}
            >
              Your tractor,{" "}
              <span style={{ color: gold }}>fully tracked</span>
              <br />
              from one screen
            </h1>
            <p
              className="rise-in text-lg mt-5 max-w-md font-light"
              style={{ color: textMuted, animationDelay: "0.28s" }}
            >
              Forgot the service date? Lost track of fuel costs? TractorMate keeps every
              tractor, driver and field job organised — on your phone, anytime.
            </p>
            <div className="rise-in flex gap-3 mt-8 flex-wrap" style={{ animationDelay: "0.4s" }}>
              <a
                href="#start"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded text-base font-medium transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: rust, color: paper }}
              >
                Get started free
                <ArrowRight size={16} />
              </a>
              <a
                href="#how"
                className="px-6 py-3.5 rounded text-base font-medium border transition-colors"
                style={{ borderColor: "rgba(243,234,214,0.28)", color: paper }}
              >
                See how it works
              </a>
            </div>
          </div>

          {/* signature dashboard cluster */}
          <div
            className="rise-in rounded-md p-6 border"
            style={{ backgroundColor: soilMid, borderColor: "rgba(243,234,214,0.1)" }}
          >
            <div
              className="flex justify-between items-center font-mono text-xs tracking-wider uppercase pb-3 mb-4 border-b"
              style={{ color: textMuted, borderColor: "rgba(243,234,214,0.08)" }}
            >
              <span>Live dashboard</span>
              <span style={{ color: green }}>● Connected</span>
            </div>
            <Gauges />
            <div
              className="flex justify-between text-sm mt-5 pt-4 border-t"
              style={{ color: textMuted, borderColor: "rgba(243,234,214,0.08)" }}
            >
              <span>
                Tractor — <b style={{ color: paper, fontWeight: 500 }}>Mahindra 575</b>
              </span>
              <span className="font-mono">#RJ14-TR-2291</span>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="py-20" style={{ backgroundColor: paper }}>
        <div className="max-w-6xl mx-auto px-7">
          <div className="max-w-xl mb-12">
            <div
              className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase mb-3"
              style={{ color: rust }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: rust }} />
              What this site does
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: soilDark }}>
              Everything about your farm, in one place
            </h2>
            <p className="text-lg mt-3 font-light" style={{ color: "#5c4c3a" }}>
              Every tractor, every driver, every expense — out of the paper diary and into your pocket.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="rounded p-6 border transition-all hover:-translate-y-1"
                  style={{ backgroundColor: paper2, borderColor: "rgba(36,26,18,0.08)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = rust)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(36,26,18,0.08)")}
                >
                  <div
                    className="w-11 h-11 rounded flex items-center justify-center mb-4"
                    style={{ backgroundColor: soilDark }}
                  >
                    <Icon size={20} color={gold} strokeWidth={1.7} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-1" style={{ color: soilDark }}>
                    {f.title}
                  </h3>
                  <p className="text-sm font-light" style={{ color: "#5c4c3a" }}>
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20" style={{ backgroundColor: soilDark }}>
        <div className="max-w-6xl mx-auto px-7">
          <div className="max-w-xl mb-14">
            <div
              className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase mb-3"
              style={{ color: gold }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: gold }} />
              Getting started
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: paper }}>
              Ready in four steps
            </h2>
            <p className="text-lg mt-3 font-light" style={{ color: textMuted }}>
              First time here? This is the whole journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-9 relative">
            {steps.map((s, i) => (
              <div key={i}>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-mono text-base mb-4 border-2"
                  style={{ borderColor: gold, color: gold }}
                >
                  {s.n}
                </div>
                <h3 className="text-2xl font-semibold mb-1" style={{ color: paper }}>
                  {s.title}
                </h3>
                <p className="text-sm font-light" style={{ color: textMuted }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="py-11" style={{ backgroundColor: rustDark }}>
        <div className="max-w-6xl mx-auto px-7 flex flex-wrap justify-between gap-6">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="font-mono text-3xl font-semibold" style={{ color: paper }}>
                {s.n}
              </div>
              <div className="text-sm opacity-85 mt-0.5" style={{ color: paper2 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FINAL CTA */}
      <section
        id="start"
        className="text-center py-24 min-h-[420px] flex items-center justify-center"
        style={{ backgroundColor: soilDark }}
      >
        <div className="max-w-6xl mx-auto px-7">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-2xl mx-auto" style={{ color: paper }}>
            Add your first tractor today
          </h2>
          <p className="text-lg mt-4 mb-8 max-w-md mx-auto font-light" style={{ color: textMuted }}>
            No paperwork to chase. Sign up and start managing your farm digitally from today.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-4 rounded text-base font-medium transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: rust, color: paper }}
          >
            Get started free
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ backgroundColor: "#1a130d", borderTop: "1px solid rgba(243,234,214,0.08)" }}>
        <div className="max-w-6xl mx-auto px-7 flex flex-wrap justify-between gap-3 text-sm" style={{ color: textMuted }}>
          <div>
            <span style={{ color: paper }}>TractorMate</span> — your farm's control panel
          </div>
          <div>© 2026 TractorMate</div>
        </div>
      </footer>
    </div>
  );
}