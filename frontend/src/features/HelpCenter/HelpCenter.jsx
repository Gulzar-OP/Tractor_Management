
import React, {
  useMemo,
  useState,
  useEffect,
} from "react";

import {
  BookOpen,
  Search,
  HelpCircle,
  ChevronRight,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

import { useSelector } from "react-redux";

import { ownerGuide } from "./data/ownerGuide";
import { driverGuide } from "./data/driverGuide";
import { adminGuide } from "./data/adminGuide";
import { faq } from "./data/faq";

import StepCard from "./components/StepCard";
import ExampleBox from "./components/ExampleBox";

// Role-wise guide data
const GUIDES_BY_ROLE = {
  owner: ownerGuide,
  driver: driverGuide,
  admin: adminGuide,
};

// Role labels
const ROLE_LABELS = {
  owner: "Owner",
  driver: "Driver",
  admin: "Admin",
};

const HelpCenter = () => {
  // Redux authentication state
  const user = useSelector((state) => state.auth.user);

  const authLoading = useSelector(
    (state) => state.auth.loading
  );

  // Local states
  const [activeSection, setActiveSection] = useState(
    "getting-started"
  );

  const [search, setSearch] = useState("");

  // Current logged-in role
  const currentRole = user?.role?.toLowerCase();

  // Get role-specific guides
  const guides = GUIDES_BY_ROLE[currentRole] || [];

  // Reset selected guide when role changes
  useEffect(() => {
    setActiveSection("getting-started");
    setSearch("");
  }, [currentRole]);

  // Search guides
  const filteredGuides = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return guides;

    return guides.filter((guide) => {
      const searchableText = [
        guide.title,
        guide.description,
        guide.intro,
        ...(guide.steps || []).map((step) => step.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [guides, search]);

  // Currently selected guide
  const activeGuide =
    guides.find((guide) => guide.id === activeSection) ||
    guides[0];

  // Role-specific FAQs
  const visibleFaqs = useMemo(() => {
    return faq.filter((item) =>
      item.role?.includes(currentRole)
    );
  }, [currentRole]);

  // Select guide
  const selectGuide = (id) => {
    setActiveSection(id);
    setSearch("");
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading help center...
        </p>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <ShieldCheck
          size={40}
          className="text-slate-300"
        />

        <h2 className="text-lg font-semibold text-slate-700">
          Login Required
        </h2>

        <p className="text-sm text-slate-500">
          Please login to access your help center.
        </p>
      </div>
    );
  }

  // Unsupported role
  if (!GUIDES_BY_ROLE[currentRole]) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Help guide is not available for your role.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* ================= HEADER ================= */}

        <div className="mb-7 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-green-600 p-6 text-white md:p-9">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-emerald-100">
                <BookOpen size={17} />
                Help Center
              </div>

              <h1 className="text-2xl font-bold md:text-3xl">
                How can we help you?
              </h1>

              <p className="mt-2 max-w-xl text-sm text-emerald-50 md:text-base">
                Learn how to use FarmLedger with simple guides,
                step-by-step instructions and real-life examples.
              </p>
            </div>

            {/* Current Role */}

            <div className="rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs text-emerald-100">
                Your current role
              </p>

              <p className="mt-1 text-xl font-semibold">
                {ROLE_LABELS[currentRole]}
              </p>
            </div>

          </div>

          {/* Search */}

          <div className="relative mt-7 max-w-2xl">

            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmers, payments, work, advance..."
              className="w-full rounded-xl border border-white/20 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-300"
            />

          </div>
        </div>

        {/* ================= MAIN LAYOUT ================= */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* ================= SIDEBAR ================= */}

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">

            <h2 className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Guide Categories
            </h2>

            <div className="space-y-1">

              {filteredGuides.map((guide) => {

                const isActive =
                  activeSection === guide.id &&
                  activeSection !== "faq";

                return (
                  <button
                    key={guide.id}
                    onClick={() => selectGuide(guide.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                      isActive
                        ? "bg-emerald-50 font-semibold text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{guide.title}</span>

                    <ChevronRight size={16} />
                  </button>
                );
              })}

              {/* FAQ Button */}

              <button
                onClick={() => {
                  setActiveSection("faq");
                  setSearch("");
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                  activeSection === "faq"
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>FAQs</span>

                <ChevronRight size={16} />
              </button>

            </div>
          </aside>

          {/* ================= CONTENT ================= */}

          <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">

            {/* ================= FAQ SECTION ================= */}

            {activeSection === "faq" ? (

              <div>

                <div className="mb-6 flex items-center gap-3">

                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <HelpCircle size={24} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Frequently Asked Questions
                    </h2>

                    <p className="text-sm text-slate-500">
                      Common questions and their answers.
                    </p>
                  </div>

                </div>

                {visibleFaqs.length > 0 ? (

                  <div className="space-y-3">

                    {visibleFaqs.map((item) => (

                      <details
                        key={item.id}
                        className="group rounded-xl border border-slate-200 p-4"
                      >

                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-700">

                          <span>{item.question}</span>

                          <ChevronRight
                            size={18}
                            className="shrink-0 transition group-open:rotate-90"
                          />

                        </summary>

                        <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-7 text-slate-600">
                          {item.answer}
                        </p>

                      </details>

                    ))}

                  </div>

                ) : (

                  <div className="rounded-xl bg-slate-50 p-8 text-center">
                    <HelpCircle
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      No FAQs available for this role.
                    </p>
                  </div>

                )}

              </div>

            ) : activeGuide ? (

              <div>

                {/* ================= GUIDE HEADING ================= */}

                <div className="mb-7 border-b border-slate-100 pb-6">

                  <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">

                    <BookOpen size={14} />

                    {ROLE_LABELS[currentRole]} Guide

                  </div>

                  <h2 className="text-2xl font-bold text-slate-800">
                    {activeGuide.title}
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {activeGuide.description}
                  </p>

                  {activeGuide.intro && (

                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                      {activeGuide.intro}
                    </p>

                  )}

                </div>

                {/* ================= STEPS ================= */}

                {activeGuide.steps?.length > 0 && (

                  <section className="mb-8">

                    <h3 className="mb-5 text-lg font-bold text-slate-800">
                      Step-by-step guide
                    </h3>

                    <div className="space-y-4">

                      {activeGuide.steps.map((step, index) => (

                        <StepCard
                          key={index}
                          number={index + 1}
                          title={step.title}
                          description={step.description}
                          image={step.image}
                          tips={step.tips}
                        />

                      ))}

                    </div>

                  </section>

                )}

                {/* ================= EXAMPLE ================= */}

                {activeGuide.example && (

                  <section className="mb-8">

                    <h3 className="mb-4 text-lg font-bold text-slate-800">
                      Real-life example
                    </h3>

                    <ExampleBox {...activeGuide.example} />

                  </section>

                )}

                {/* ================= TIPS ================= */}

                {activeGuide.tips?.length > 0 && (

                  <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">

                    <div className="mb-3 flex items-center gap-2 font-bold text-amber-800">

                      <Lightbulb size={19} />

                      Important Tips

                    </div>

                    <ul className="space-y-2 text-sm leading-6 text-amber-900">

                      {activeGuide.tips.map((tip, index) => (

                        <li
                          key={index}
                          className="flex gap-2"
                        >
                          <span>•</span>
                          <span>{tip}</span>
                        </li>

                      ))}

                    </ul>

                  </section>

                )}

                {/* ================= SECURITY NOTE ================= */}

                <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">

                  <ShieldCheck
                    size={21}
                    className="shrink-0 text-blue-600"
                  />

                  <div>

                    <h4 className="text-sm font-semibold text-blue-900">
                      Keep your records safe
                    </h4>

                    <p className="mt-1 text-xs leading-6 text-blue-800">
                      Always verify farmer details, work entries,
                      advances and payments before saving.
                    </p>

                  </div>

                </div>

              </div>

            ) : (

              /* ================= NO GUIDE ================= */

              <div className="py-16 text-center">

                <HelpCircle
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-3 font-semibold text-slate-700">
                  No guide found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try another search keyword.
                </p>

              </div>

            )}

          </main>

        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
