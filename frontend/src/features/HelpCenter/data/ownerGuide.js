
export const ownerGuide = [
  // 1. GETTING STARTED
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn how to get started with FarmLedger.",
    intro:
      "FarmLedger helps you manage farmers, agricultural work, payments, advances and business expenses from one place.",

    steps: [
      {
        title: "Login to your account",
        description:
          "Open FarmLedger and enter your registered login credentials.",
        tip: "Keep your login credentials private."
      },
      {
        title: "Explore the dashboard",
        description:
          "After login, you will reach the dashboard where you can see your business overview."
      },
      {
        title: "Explore the sidebar",
        description:
          "Use the sidebar to navigate between Farmers, Work, Payments, Expenses and other modules."
      }
    ],

    example: {
      title: "Getting Started Example",
      description:
        "Suppose you have started using FarmLedger for your tractor business.",
      items: [
        { label: "Login", value: "Successful" },
        { label: "Account Role", value: "Owner" },
        { label: "First Step", value: "Add Farmers" }
      ],
      result: "Your business management journey starts here."
    }
  },

  // 2. DASHBOARD
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Understand your business performance.",
    intro:
      "The dashboard provides a quick overview of your business activities and financial records.",

    steps: [
      {
        title: "Open Dashboard",
        description:
          "After logging in, open Dashboard from the sidebar."
      },
      {
        title: "Check Farmer Statistics",
        description:
          "Review the farmer-related information displayed on your dashboard."
      },
      {
        title: "Check Work Summary",
        description:
          "Monitor your recorded agricultural work and related amounts."
      },
      {
        title: "Review Financial Overview",
        description:
          "Check available payment, due and expense summaries."
      }
    ],

    example: {
      title: "Business Overview Example",
      description:
        "Imagine you manage a tractor business with multiple farmers.",
      items: [
        { label: "Total Farmers", value: "50" },
        { label: "Total Work Amount", value: "₹80,000" },
        { label: "Payments Received", value: "₹50,000" },
        { label: "Pending Due", value: "₹30,000" }
      ],
      result: "You can understand your business position at a glance."
    }
  },

  // 3. FARMER MANAGEMENT
  {
    id: "farmers",
    title: "Farmer Management",
    description: "Add, update and search farmer records.",
    intro:
      "Farmer Management allows you to maintain complete records of farmers working with your business.",

    steps: [
      {
        title: "Open Farmers",
        description:
          "Select Farmers from the sidebar to view your farmer records."
      },
      {
        title: "Add New Farmer",
        description:
          "Click Add Farmer and enter the farmer's name, mobile number, village and other required details."
      },
      {
        title: "Save Farmer Details",
        description:
          "Review the information and save the farmer record."
      },
      {
        title: "Search Farmers",
        description:
          "Use the search option to find farmers by their name or available search fields."
      },
      {
        title: "Update Farmer Details",
        description:
          "Open the farmer record, select Edit, update the required information and save."
      },
      {
        title: "View Farmer Profile",
        description:
          "Open an individual farmer profile to review relevant work, advance and payment information."
      }
    ],

    example: {
      title: "Add a New Farmer",
      description:
        "Suppose Ram Kumar comes to your business for tractor work.",
      items: [
        { label: "Farmer Name", value: "Ram Kumar" },
        { label: "Mobile", value: "9876543210" },
        { label: "Village", value: "Rampur" }
      ],
      result: "Ram Kumar's farmer record is ready."
    },

    tips: [
      "Always enter the correct mobile number.",
      "Avoid creating duplicate farmer records.",
      "Verify details before saving."
    ]
  },

  // 4. WORK MANAGEMENT
  {
    id: "work",
    title: "Work Management",
    description: "Record and manage agricultural work.",
    intro:
      "Use Work Management to record work performed for farmers and track the corresponding amounts.",

    steps: [
      {
        title: "Open Work Management",
        description:
          "Navigate to the Work section from the sidebar."
      },
      {
        title: "Create New Work",
        description:
          "Click the Add Work option to create a new work record."
      },
      {
        title: "Select Farmer",
        description:
          "Choose the farmer for whom the work was performed."
      },
      {
        title: "Enter Work Details",
        description:
          "Enter the work date, work type, quantity, rate and other required details."
      },
      {
        title: "Review Total Amount",
        description:
          "Check the calculated work amount before saving."
      },
      {
        title: "Save Work Record",
        description:
          "Save the record to maintain the farmer's work history."
      }
    ],

    example: {
      title: "Tractor Work Calculation",
      description:
        "Ram Kumar used your tractor for agricultural work.",
      items: [
        { label: "Land Area", value: "2 Acres" },
        { label: "Rate Per Acre", value: "₹2,000" },
        { label: "Total Work", value: "₹4,000" }
      ],
      calculation: "2 Acres × ₹2,000 = ₹4,000",
      result: "Total Work Amount: ₹4,000"
    },

    tips: [
      "Always select the correct farmer.",
      "Verify the quantity and rate.",
      "Check the work date before saving."
    ]
  },

  // 5. ADVANCE MANAGEMENT
  {
    id: "advance",
    title: "Advance Management",
    description: "Record advances given to farmers.",
    intro:
      "Advance Management helps you maintain a record of money given to farmers before or during their work.",

    steps: [
      {
        title: "Find the Farmer",
        description:
          "Open the relevant farmer's profile."
      },
      {
        title: "Select Give Advance",
        description:
          "Choose the advance payment option."
      },
      {
        title: "Enter Advance Amount",
        description:
          "Enter the amount given to the farmer."
      },
      {
        title: "Enter Payment Details",
        description:
          "Select the payment method and provide other required details."
      },
      {
        title: "Save Advance",
        description:
          "Save the transaction and verify that the advance ledger has been updated."
      }
    ],

    example: {
      title: "Farmer Advance Example",
      description:
        "You give Ram Kumar an advance before completing his work.",
      items: [
        { label: "Farmer", value: "Ram Kumar" },
        { label: "Advance Given", value: "₹1,000" },
        { label: "Work Amount", value: "₹4,000" }
      ],
      calculation: "₹4,000 - ₹1,000 = ₹3,000",
      result: "Remaining Amount: ₹3,000"
    },

    tips: [
      "Record every advance transaction.",
      "Verify the farmer before submitting.",
      "Do not enter the same advance twice."
    ]
  },

  // 6. PAYMENT MANAGEMENT
  {
    id: "payments",
    title: "Payment Management",
    description: "Record and track farmer payments.",
    intro:
      "Payment Management allows you to record money received from farmers and maintain accurate payment history.",

    steps: [
      {
        title: "Open Farmer Profile",
        description:
          "Find and open the farmer whose payment you want to record."
      },
      {
        title: "Select Receive Payment",
        description:
          "Choose the payment recording option."
      },
      {
        title: "Enter Payment Amount",
        description:
          "Enter the amount received from the farmer."
      },
      {
        title: "Select Payment Method",
        description:
          "Choose the applicable payment method, such as Cash, UPI or Bank Transfer, if available."
      },
      {
        title: "Save Payment",
        description:
          "Save the transaction and verify the updated payment record."
      }
    ],

    example: {
      title: "Payment Received Example",
      description:
        "Ram Kumar pays ₹2,000 against his pending amount.",
      items: [
        { label: "Previous Due", value: "₹3,000" },
        { label: "Payment Received", value: "₹2,000" }
      ],
      calculation: "₹3,000 - ₹2,000 = ₹1,000",
      result: "Remaining Due: ₹1,000"
    },

    tips: [
      "Enter only the amount actually received.",
      "Verify the payment method.",
      "Check the remaining due after saving."
    ]
  },

  // 7. DUE SUMMARY
  {
    id: "reports",
    title: "Due Summary & Reports",
    description: "Monitor pending dues and financial records.",
    intro:
      "Use Due Summary to understand how much money is pending from farmers and review your business financial position.",

    steps: [
      {
        title: "Open Due Summary",
        description:
          "Select Due Summary from the sidebar."
      },
      {
        title: "Find Farmer Due",
        description:
          "Search or select a farmer to view their pending amount."
      },
      {
        title: "Review Payment History",
        description:
          "Check recorded work, advances and payments to understand the outstanding balance."
      },
      {
        title: "Review Overall Summary",
        description:
          "Check the available overall due information and financial summaries."
      }
    ],

    example: {
      title: "Due Summary Example",
      description:
        "You want to check Ram Kumar's outstanding balance.",
      items: [
        { label: "Total Work", value: "₹4,000" },
        { label: "Advance", value: "₹1,000" },
        { label: "Payment Received", value: "₹2,000" }
      ],
      calculation: "₹4,000 - ₹1,000 - ₹2,000 = ₹1,000",
      result: "Ram Kumar's Remaining Due: ₹1,000"
    }
  },

  // 8. EXPENSE MANAGEMENT
  {
    id: "expenses",
    title: "Expense Management",
    description: "Track your business expenses.",
    intro:
      "Expense Management helps you maintain records of money spent on fuel, maintenance, repairs and other business activities.",

    steps: [
      {
        title: "Open Expenses",
        description:
          "Navigate to Expenses from the sidebar."
      },
      {
        title: "Add New Expense",
        description:
          "Click Add Expense to create a new expense record."
      },
      {
        title: "Enter Expense Details",
        description:
          "Enter the amount, category, date and description."
      },
      {
        title: "Save Expense",
        description:
          "Review and save the expense record."
      },
      {
        title: "Review Expenses",
        description:
          "View your recorded expenses and available summaries."
      }
    ],

    example: {
      title: "Daily Business Expenses",
      description:
        "Suppose you spent money on maintaining your tractor.",
      items: [
        { label: "Diesel", value: "₹1,500" },
        { label: "Repair", value: "₹800" },
        { label: "Other Expenses", value: "₹200" }
      ],
      calculation: "₹1,500 + ₹800 + ₹200 = ₹2,500",
      result: "Total Expenses: ₹2,500"
    }
  },

  // 9. USER ROLES
  {
    id: "roles",
    title: "User Roles & Permissions",
    description: "Understand Owner, Driver and Admin access.",
    intro:
      "FarmLedger supports different user roles to help manage access and responsibilities.",

    steps: [
      {
        title: "Owner",
        description:
          "The Owner manages their business records, farmers, work, advances, payments, expenses and available reports."
      },
      {
        title: "Driver",
        description:
          "The Driver uses the features permitted by the Owner, such as assigned farmer records and work-related activities."
      },
      {
        title: "Admin",
        description:
          "The Admin manages the system and has access to administrative operations according to configured permissions."
      }
    ],

    example: {
      title: "Role Example",
      description:
        "A business owner has two drivers working under the business.",
      items: [
        { label: "Owner", value: "Business Management" },
        { label: "Driver 1", value: "Assigned Work" },
        { label: "Driver 2", value: "Assigned Work" },
        { label: "Admin", value: "System Management" }
      ],
      result: "Each user accesses features according to their permissions."
    }
  }
];

export default ownerGuide;
