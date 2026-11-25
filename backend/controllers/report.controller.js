import WorkLog from "../models/work.model.js";
import Expense from "../models/expenses.model.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;

const round2 = (n) => Math.round(n * 100) / 100;

// Date ko IST ke hisaab se "YYYY-MM-DD" key me badlo
const istDayKey = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// "YYYY-MM-DD" ko IST din ki shuruaat (00:00 IST) me badlo
const parseISTStart = (s) => {
  const d = new Date(`${s}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const emptyDay = (date) => ({
  date,
  works: [],
  expenses: [],
  totals: {
    works: 0,
    minutes: 0,
    amount: 0,
    paid: 0,
    due: 0,
    expense: 0,
    net: 0,
  },
});

// GET /api/report/date-wise?from=2026-11-01&to=2026-11-21
export const dateWiseReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      !DATE_RE.test(from) ||
      !DATE_RE.test(to)
    ) {
      return res.status(400).json({
        success: false,
        message: "from aur to YYYY-MM-DD format me do",
      });
    }

    const start = parseISTStart(from);
    const lastDay = parseISTStart(to);

    if (!start || !lastDay) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }
    if (lastDay < start) {
      return res.status(400).json({
        success: false,
        message: "'to' date 'from' se pehle nahi ho sakti",
      });
    }

    const end = new Date(lastDay.getTime() + DAY_MS); // to-date ka poora din shamil
    if ((end.getTime() - start.getTime()) / DAY_MS > MAX_DAYS) {
      return res.status(400).json({
        success: false,
        message: `Ek baar me maximum ${MAX_DAYS} din ka report mil sakta hai`,
      });
    }

    const isOwner = req.user.role === "owner";

    // Owner ko sab dikhta hai, driver ko sirf apna kiya hua kaam
    const workFilter = {
      owner: req.user.ownerId,
      date: { $gte: start, $lt: end },
    };
    if (!isOwner) workFilter.createdBy = req.user.userId;

    const [works, expenses] = await Promise.all([
      WorkLog.find(workFilter)
        .populate("farmer", "name phone village")
        .sort({ date: -1 })
        .lean(),
      // Kharcha sirf owner ko dikhta hai
      isOwner
        ? Expense.find({
            owner: req.user.ownerId,
            date: { $gte: start, $lt: end },
          })
            .sort({ date: -1 })
            .lean()
        : [],
    ]);

    const dayMap = new Map();
    const getDay = (key) => {
      if (!dayMap.has(key)) dayMap.set(key, emptyDay(key));
      return dayMap.get(key);
    };

    const summary = {
      totalWorks: 0,
      totalMinutes: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
      totalExpense: 0,
      net: 0,
    };

    for (const w of works) {
      const day = getDay(istDayKey(w.date));
      day.works.push({
        _id: w._id,
        farmer: w.farmer
          ? {
              _id: w.farmer._id,
              name: w.farmer.name,
              phone: w.farmer.phone,
              village: w.farmer.village,
            }
          : null,
        fieldName: w.fieldName,
        workType: w.workType,
        status: w.status,
        paymentStatus: w.paymentStatus,
        startTime: w.startTime,
        endTime: w.endTime,
        totalMinutes: w.totalMinutes || 0,
        totalAmount: w.totalAmount || 0,
        paidAmount: w.paidAmount || 0,
        dueAmount: w.dueAmount || 0,
      });

      // CANCELLED work list me dikhega, par totals me nahi ginega
      if (w.status === "CANCELLED") continue;

      day.totals.works += 1;
      day.totals.minutes += w.totalMinutes || 0;
      day.totals.amount += w.totalAmount || 0;
      day.totals.paid += w.paidAmount || 0;
      day.totals.due += w.dueAmount || 0;
    }

    for (const e of expenses) {
      const day = getDay(istDayKey(e.date));
      day.expenses.push({
        _id: e._id,
        type: e.type,
        amount: e.amount,
        notes: e.notes,
      });
      day.totals.expense += e.amount || 0;
    }

    const days = [...dayMap.values()].sort((a, b) =>
      a.date < b.date ? 1 : -1
    ); // naya din pehle

    for (const day of days) {
      day.totals.minutes = round2(day.totals.minutes);
      day.totals.net = day.totals.amount - day.totals.expense;

      summary.totalWorks += day.totals.works;
      summary.totalMinutes += day.totals.minutes;
      summary.totalAmount += day.totals.amount;
      summary.totalPaid += day.totals.paid;
      summary.totalDue += day.totals.due;
      summary.totalExpense += day.totals.expense;
    }

    summary.totalMinutes = round2(summary.totalMinutes);
    summary.net = summary.totalAmount - summary.totalExpense;

    return res.status(200).json({ success: true, from, to, summary, days });
  } catch (err) {
    console.error("dateWiseReport error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};