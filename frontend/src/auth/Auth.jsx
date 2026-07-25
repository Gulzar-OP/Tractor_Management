import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const navigate = useNavigate();

  const cards = [
    {
      role: 'owner',
      path: '/login/owner',
      gradient: 'from-indigo-500 to-purple-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 11-4 0m4 0a2 2 0 01-2 2m2-2h.01M7 21h10a2 2 0 002-2v-2H5v2a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      role: 'driver',
      path: '/login/driver',
      gradient: 'from-emerald-500 to-teal-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-center text-3xl md:text-4xl font-bold text-slate-800 mb-10">
          Select your role
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map((card) => (
            <div
              key={card.role}
              onClick={() => navigate(card.path)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 cursor-pointer
                       shadow-sm hover:shadow-md transition-all duration-300
                       hover:-translate-y-1"
            >
              {/* Gradient background on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 
                           group-hover:opacity-10 transition-opacity duration-300`}
              />

              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div
                  className={`rounded-xl bg-gradient-to-br ${card.gradient} p-4 shadow-md
                              group-hover:scale-105 transition-transform duration-300`}
                >
                  {card.icon}
                </div>

                <h2 className="text-xl font-semibold text-slate-800 capitalize">
                  {card.role}
                </h2>

                <p className="text-sm text-slate-500">
                  Continue as {card.role}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-10">
          Choose your account type to proceed
        </p>
      </div>
    </div>
  );
}