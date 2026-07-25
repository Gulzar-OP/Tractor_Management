// mockData.js
export const FARMERS = [
  { id: "F001", name: "Ram Kumar Yadav", father: "Sita Ram Yadav", phone: "9835012345", village: "Purnai", address: "Ward No. 4, Purnai, Purnia", notes: "Regular customer, prefers morning slots.", totalWorks: 6, totalAmount: 32400, paid: 24400, due: 8000, lastWork: "12 Jul 2026" },
  { id: "F002", name: "Suresh Mahto", father: "Bishun Mahto", phone: "9835098765", village: "Katihar Road", address: "Near Shiv Mandir, Katihar Road", notes: "Pays via UPI mostly.", totalWorks: 4, totalAmount: 18800, paid: 18800, due: 0, lastWork: "09 Jul 2026" },
  { id: "F003", name: "Dilip Singh", father: "Harihar Singh", phone: "9905512340", village: "Araria Chowk", address: "Araria Chowk, Main Road", notes: "", totalWorks: 5, totalAmount: 27500, paid: 15500, due: 12000, lastWork: "13 Jul 2026" },
  { id: "F004", name: "Bimla Devi", father: "Late Ramesh Sah", phone: "9835067812", village: "Kishanganj", address: "Village Kishanganj, Block 2", notes: "Owns 8 bigha land.", totalWorks: 3, totalAmount: 14200, paid: 9200, due: 5000, lastWork: "05 Jul 2026" },
  { id: "F005", name: "Manoj Paswan", father: "Chandra Paswan", phone: "9430045678", village: "Madhepura", address: "Madhepura, Near Bus Stand", notes: "Needs reminder calls for dues.", totalWorks: 7, totalAmount: 41600, paid: 29600, due: 12000, lastWork: "11 Jul 2026" },
  { id: "F006", name: "Rajesh Ram", father: "Nand Kishore Ram", phone: "9931023456", village: "Saharsa", address: "Ward 9, Saharsa", notes: "", totalWorks: 2, totalAmount: 9600, paid: 9600, due: 0, lastWork: "28 Jun 2026" },
  { id: "F007", name: "Vikash Kumar", father: "Om Prakash", phone: "9835077821", village: "Purnai", address: "Purnai Chowk, Near School", notes: "New customer, referred by Ram Kumar.", totalWorks: 1, totalAmount: 4200, paid: 0, due: 4200, lastWork: "14 Jul 2026" },
  { id: "F008", name: "Anil Kumar", father: "Baleshwar Yadav", phone: "9905588213", village: "Katihar Road", address: "Katihar Road, House No. 12", notes: "", totalWorks: 4, totalAmount: 21200, paid: 21200, due: 0, lastWork: "01 Jul 2026" }
];

export const WORKTYPES = ["Hal","Rotavator","Cultivator","Seed Drill","Trailer","Leveler","Others"];

export const WORKRECORDS = [
  { id: "W101", farmerId: "F001", farmer: "Ram Kumar Yadav", date: "14 Jul 2026", type: "Rotavator", hours: 3.5, rate: 800, amount: 2800, paid: 2800, due: 0, status: "Paid" },
  { id: "W102", farmerId: "F003", farmer: "Dilip Singh", date: "13 Jul 2026", type: "Hal", hours: 4, rate: 750, amount: 3000, paid: 1000, due: 2000, status: "Partial" },
  { id: "W103", farmerId: "F005", farmer: "Manoj Paswan", date: "11 Jul 2026", type: "Trailer", hours: 2, rate: 900, amount: 1800, paid: 0, due: 1800, status: "Due" },
  { id: "W104", farmerId: "F001", farmer: "Ram Kumar Yadav", date: "09 Jul 2026", type: "Cultivator", hours: 5, rate: 700, amount: 3500, paid: 3500, due: 0, status: "Paid" },
  { id: "W105", farmerId: "F002", farmer: "Suresh Mahto", date: "09 Jul 2026", type: "Seed Drill", hours: 2.5, rate: 850, amount: 2125, paid: 2125, due: 0, status: "Paid" },
  { id: "W106", farmerId: "F004", farmer: "Bimla Devi", date: "05 Jul 2026", type: "Leveler", hours: 3, rate: 780, amount: 2340, paid: 1340, due: 1000, status: "Partial" },
  { id: "W107", farmerId: "F007", farmer: "Vikash Kumar", date: "14 Jul 2026", type: "Hal", hours: 5.5, rate: 750, amount: 4125, paid: 0, due: 4125, status: "Due" },
  { id: "W108", farmerId: "F006", farmer: "Rajesh Ram", date: "28 Jun 2026", type: "Rotavator", hours: 4, rate: 800, amount: 3200, paid: 3200, due: 0, status: "Paid" },
  { id: "W109", farmerId: "F008", farmer: "Anil Kumar", date: "01 Jul 2026", type: "Cultivator", hours: 6, rate: 700, amount: 4200, paid: 4200, due: 0, status: "Paid" },
  { id: "W110", farmerId: "F003", farmer: "Dilip Singh", date: "02 Jul 2026", type: "Trailer", hours: 3, rate: 900, amount: 2700, paid: 0, due: 2700, status: "Due" },
  { id: "W111", farmerId: "F005", farmer: "Manoj Paswan", date: "03 Jul 2026", type: "Rotavator", hours: 4.5, rate: 800, amount: 3600, paid: 3600, due: 0, status: "Paid" },
  { id: "W112", farmerId: "F001", farmer: "Ram Kumar Yadav", date: "14 Jul 2026", type: "Leveler", hours: 2, rate: 780, amount: 1560, paid: 1560, due: 0, status: "Paid" }
];

export const PAYMENTS = [
  { id: "P201", farmer: "Ram Kumar Yadav", work: "W101 - Rotavator", amount: 2800, method: "UPI", date: "14 Jul 2026", notes: "Paid on completion" },
  { id: "P202", farmer: "Dilip Singh", work: "W102 - Hal", amount: 1000, method: "Cash", date: "13 Jul 2026", notes: "Part payment" },
  { id: "P203", farmer: "Ram Kumar Yadav", work: "W104 - Cultivator", amount: 3500, method: "Cash", date: "09 Jul 2026", notes: "" },
  { id: "P204", farmer: "Suresh Mahto", work: "W105 - Seed Drill", amount: 2125, method: "UPI", date: "09 Jul 2026", notes: "" },
  { id: "P205", farmer: "Bimla Devi", work: "W106 - Leveler", amount: 1340, method: "Bank", date: "05 Jul 2026", notes: "NEFT transfer" },
  { id: "P206", farmer: "Rajesh Ram", work: "W108 - Rotavator", amount: 3200, method: "Cash", date: "28 Jun 2026", notes: "" },
  { id: "P207", farmer: "Anil Kumar", work: "W109 - Cultivator", amount: 4200, method: "UPI", date: "01 Jul 2026", notes: "" },
  { id: "P208", farmer: "Manoj Paswan", work: "W111 - Rotavator", amount: 3600, method: "Cash", date: "03 Jul 2026", notes: "" },
  { id: "P209", farmer: "Ram Kumar Yadav", work: "W112 - Leveler", amount: 1560, method: "UPI", date: "14 Jul 2026", notes: "" }
];

export const EXPENSES = [
  { id: "E301", type: "Diesel", amount: 3200, date: "14 Jul 2026", notes: "Full tank before field work" },
  { id: "E302", type: "Repair", amount: 1800, date: "12 Jul 2026", notes: "Clutch plate adjustment" },
  { id: "E303", type: "Engine Oil", amount: 950, date: "10 Jul 2026", notes: "15W-40, 5 litre" },
  { id: "E304", type: "Diesel", amount: 2800, date: "08 Jul 2026", notes: "" },
  { id: "E305", type: "Grease", amount: 300, date: "06 Jul 2026", notes: "" },
  { id: "E306", type: "Tyre", amount: 4200, date: "02 Jul 2026", notes: "Rear right tyre puncture repair" },
  { id: "E307", type: "Diesel", amount: 3000, date: "29 Jun 2026", notes: "" },
  { id: "E308", type: "Others", amount: 500, date: "27 Jun 2026", notes: "Driver food tea" }
];

export const MONTHLYINCOME = [
  { month: "Feb", income: 38200, expense: 9800 },
  { month: "Mar", income: 45600, expense: 11200 },
  { month: "Apr", income: 51200, expense: 10400 },
  { month: "May", income: 47300, expense: 12800 },
  { month: "Jun", income: 54800, expense: 9600 },
  { month: "Jul", income: 32950, expense: 16750 }
];

export const EXPENSEBREAKDOWN = [
  { name: "Diesel", value: 9000, color: "#16A34A" },
  { name: "Repair", value: 1800, color: "#0F172A" },
  { name: "Engine Oil", value: 950, color: "#4ADE80" },
  { name: "Tyre", value: 4200, color: "#86EFAC" },
  { name: "Grease", value: 300, color: "#166534" },
  { name: "Others", value: 500, color: "#94A3B8" }
];

export const WORKRATESDEFAULT = [
  { type: "Hal", rate: 750 },
  { type: "Rotavator", rate: 800 },
  { type: "Cultivator", rate: 700 },
  { type: "Seed Drill", rate: 850 },
  { type: "Trailer", rate: 900 },
  { type: "Leveler", rate: 780 },
  { type: "Others", rate: 700 }
];

export const EXPENSETYPES = ["Diesel","Repair","Engine Oil","Grease","Tyre","Others"];
export const EXPENSEICONS = {
  Diesel: "Fuel",
  Repair: "Wrench",
  "Engine Oil": "Droplet",
  Grease: "CircleDot",
  Tyre: "CircleDot",
  Others: "MoreHorizontal"
};

export const inr = (n) => Number(n).toLocaleString("en-IN");