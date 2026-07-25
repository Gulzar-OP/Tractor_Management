import React from "react";

export default function PrimaryButton({ children, onClick, icon: Icon, className = "", type = "button" }) {
  return (
    <button type={type} onClick={onClick} className={`inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover:bg-green-700 hover:shadow-md active:scale-95 transition-all duration-200 ${className}`}>
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}