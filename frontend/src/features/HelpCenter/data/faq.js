
export const faq = [
  {
    id: "add-farmer",
    role: ["owner", "driver", "admin"],
    category: "Farmers",
    question: "Naya farmer kaise add karein?",
    answer:
      "Farmers section open karein aur Add Farmer par click karein. Farmer ka naam, mobile number, address aur required details fill karke Save karein. Aapke role ke permissions ke according hi ye option available hoga.",
  },
  {
    id: "search-farmer",
    role: ["owner", "driver", "admin"],
    category: "Farmers",
    question: "Farmer ko search kaise karein?",
    answer:
      "Farmers page par search box mein farmer ka naam ya mobile number enter karein. Agar farmer nahi mil raha hai, spelling aur number check karein. Aapko sirf wahi farmers dikh sakte hain jinhe dekhne ki permission hai.",
  },
  {
    id: "add-work",
    role: ["owner", "driver", "admin"],
    category: "Work",
    question: "Farmer ka work record kaise add karein?",
    answer:
      "Work section mein Add Work open karein. Farmer select karein, work ki date, quantity aur rate enter karein. Total amount verify karke record save karein.",
  },
  {
    id: "work-calculation",
    role: ["owner", "driver", "admin"],
    category: "Work",
    question: "Work ka total amount kaise calculate hota hai?",
    answer:
      "Total amount generally quantity × rate se calculate hota hai. Example: 10 units × ₹400 = ₹4,000. Apne app mein configured calculation rules ko follow karein.",
  },
  {
    id: "farmer-advance",
    role: ["owner", "driver", "admin"],
    category: "Advance",
    question: "Farmer ko advance kaise dein?",
    answer:
      "Advance section ya farmer ke details page par available advance option open karein. Amount, date aur description enter karke save karein. Save karne se pehle amount verify zaroor karein.",
  },
  {
    id: "payment-entry",
    role: ["owner", "driver", "admin"],
    category: "Payments",
    question: "Farmer ka payment kaise record karein?",
    answer:
      "Payments section mein payment entry add karein. Farmer select karein, amount aur payment date enter karein. Payment method aur note bhi add karein agar ye fields available hain.",
  },
  {
    id: "due-calculation",
    role: ["owner", "driver", "admin"],
    category: "Due Summary",
    question: "Farmer ka remaining due kaise calculate hota hai?",
    answer:
      "Example: Total work ₹5,000 hai aur farmer ko ₹1,000 advance aur ₹2,000 payment diya gaya hai, toh remaining due ₹2,000 hoga. Actual calculation app ke configured ledger rules par depend karega.",
  },
  {
    id: "edit-farmer",
    role: ["owner", "driver", "admin"],
    category: "Farmers",
    question: "Farmer ki details edit kaise karein?",
    answer:
      "Farmers page par farmer ko open karein aur Edit option select karein. Required details update karke save karein. Edit permission na hone par Owner ya Admin se contact karein.",
  },
  {
    id: "wrong-payment",
    role: ["owner", "admin"],
    category: "Payments",
    question: "Galat payment entry save ho gayi toh kya karein?",
    answer:
      "Payment record ko open karke dekhein ki Edit ya Delete option available hai ya nahi. Agar option available nahi hai, Admin ya authorized Owner se correction karwayein. Bina verify kiye duplicate payment entry na banayein.",
  },
  {
    id: "duplicate-record",
    role: ["owner", "driver", "admin"],
    category: "General",
    question: "Duplicate work ya payment record se kaise bachein?",
    answer:
      "Save karne se pehle farmer, date aur amount verify karein. Agar save button click karne ke baad loading ho rahi hai, toh dobara click karne se pehle record list check karein.",
  },
  {
    id: "permissions",
    role: ["owner", "driver", "admin"],
    category: "Account",
    question: "Kuch options mujhe kyun nahi dikh rahe?",
    answer:
      "App mein har role ki permissions alag ho sakti hain. Driver ko limited options mil sakte hain, Owner apne business ka data manage karta hai aur Admin ko administrative access mil sakta hai. Access ke liye authorized Admin se contact karein.",
  },
  {
    id: "offline-mode",
    role: ["owner", "driver", "admin"],
    category: "Technical",
    question: "Kya app bina internet ke use kar sakte hain?",
    answer:
      "Offline access tabhi possible hai jab app mein offline storage aur sync functionality enabled ho. Agar offline mode available nahi hai, toh data save karne ke liye internet connection zaroori hoga.",
  },
  {
    id: "account-security",
    role: ["owner", "driver", "admin"],
    category: "Account",
    question: "Apna account secure kaise rakhein?",
    answer:
      "Apna password kisi ke saath share na karein. Public ya shared device par kaam karne ke baad logout karein. Suspicious activity dikhe toh Admin ko inform karein.",
  },
];

export default faq;
