import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function Reports() {

  const [income, setIncome] = useState([]);
  const [expense, setExpense] = useState([]);

  useEffect(() => {
    fetchIncome();
    fetchExpenses();
  }, []);

  const fetchIncome = async () => {
    const res = await axios.get(`${API}/work/all-works`);
    setIncome(res.data);
  };

  const fetchExpenses = async () => {
    const res = await axios.get(`${API}/expenses/all-expenses`);
    setExpense(res.data.expenses);
  };

  const MONTHLYREPORT = useMemo(() => {

    const monthlyReport = {};

    income.forEach((work) => {
      const month = new Date(work.date).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyReport[month]) {
        monthlyReport[month] = {
          month,
          income: 0,
          expense: 0,
        };
      }

      monthlyReport[month].income += work.totalAmount;
    });

    expense.forEach((exp) => {
      const month = new Date(exp.date).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyReport[month]) {
        monthlyReport[month] = {
          month,
          income: 0,
          expense: 0,
        };
      }

      monthlyReport[month].expense += exp.amount;
    });

    return Object.values(monthlyReport);

  }, [income, expense]);

  console.log(MONTHLYREPORT);

  return <div>Reports</div>;
}