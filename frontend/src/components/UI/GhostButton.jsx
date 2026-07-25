import React from "react";

export default function GhostButton({ children, onClick, icon: Icon, className = "" }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-2xl font-semibold text-sm hover:bg-slate-50 active:scale-95 transition-all duration-200 ${className}`}>
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}