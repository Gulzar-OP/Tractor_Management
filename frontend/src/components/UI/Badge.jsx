import React from "react";

const Badge = ({ status }) => {
  const styles = {
    paid: "bg-green-100 text-green-700 font-semibold",
    due: "bg-red-100 text-red-700 font-bold",
    partial: "bg-yellow-100 text-yellow-700 font-semibold",
    advanced: "bg-blue-100 text-blue-700 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
        styles[status?.toLowerCase()] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
};

export default Badge;