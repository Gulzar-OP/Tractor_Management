
export const driverGuide = [
  // 1. GETTING STARTED
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn how to use your Driver account.",
    intro:
      "FarmLedger helps drivers manage their assigned work and access business information according to their permissions.",

    steps: [
      {
        title: "Login to your account",
        description:
          "Open FarmLedger and enter the login credentials provided by your Owner or Admin."
      },
      {
        title: "Explore your dashboard",
        description:
          "After login, review the information and activities available on your dashboard."
      },
      {
        title: "Understand your permissions",
        description:
          "Your available menu options depend on the permissions assigned to your account."
      }
    ],

    example: {
      title: "Driver Account Example",
      description:
        "Suppose you work as a tractor driver under an Owner.",
      items: [
        { label: "Account Role", value: "Driver" },
        { label: "Assigned By", value: "Owner" },
        { label: "Main Responsibility", value: "Work Management" }
      ],
      result:
        "You can use the features enabled for your account."
    }
  },

  // 2. DASHBOARD
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Understand your daily work overview.",
    intro:
      "The dashboard provides a quick view of the information available to your Driver account.",

    steps: [
      {
        title: "Open Dashboard",
        description:
          "After login, open Dashboard from the sidebar."
      },
      {
        title: "Review Available Statistics",
        description:
          "Check the work-related statistics and other information displayed for your account."
      },
      {
        title: "Check Recent Activities",
        description:
          "Review your recent work entries and available notifications, if enabled."
      }
    ],

    example: {
      title: "Daily Work Overview",
      description:
        "Suppose you have completed work for multiple farmers.",
      items: [
        { label: "Assigned Farmers", value: "As displayed" },
        { label: "Completed Work", value: "As recorded" },
        { label: "Pending Work", value: "As displayed" }
      ],
      result:
        "You can review your available work information from one place."
    }
  },

  // 3. FARMER MANAGEMENT
  {
    id: "farmers",
    title: "Farmer Management",
    description: "Find and manage available farmer records.",
    intro:
      "The Farmers section helps you access farmer information available to your account.",

    steps: [
      {
        title: "Open Farmers",
        description:
          "Select Farmers from the sidebar."
      },
      {
        title: "View Farmer List",
        description:
          "Check the farmer records visible to your account."
      },
      {
        title: "Search a Farmer",
        description:
          "Use the search option to find a farmer by name or other supported search fields."
      },
      {
        title: "Open Farmer Profile",
        description:
          "Select a farmer to view the details and related information available to you."
      },
      {
        title: "Update Farmer Information",
        description:
          "If editing permission is enabled, update the permitted details and save them."
      }
    ],

    example: {
      title: "Finding a Farmer",
      description:
        "Suppose the Owner asks you to perform work for Ram Kumar.",
      items: [
        { label: "Farmer Name", value: "Ram Kumar" },
        { label: "Village", value: "Rampur" },
        { label: "Action", value: "Search Farmer" }
      ],
      result:
        "Find the correct farmer record before starting the work."
    },

    tips: [
      "Always verify the farmer's identity.",
      "Avoid creating duplicate records.",
      "Do not modify information without permission."
    ]
  },

  // 4. WORK MANAGEMENT
  {
    id: "work",
    title: "Work Management",
    description: "Record agricultural work activities.",
    intro:
      "Work Management allows drivers to record work activities when work-entry permission is enabled.",

    steps: [
      {
        title: "Open Work Management",
        description:
          "Select Work from the sidebar."
      },
      {
        title: "Create Work Entry",
        description:
          "Click Add Work if this option is available for your account."
      },
      {
        title: "Select Farmer",
        description:
          "Choose the correct farmer for whom the work was performed."
      },
      {
        title: "Enter Work Details",
        description:
          "Enter the work date, work type, quantity, rate and other required information."
      },
      {
        title: "Verify Work Amount",
        description:
          "Check the quantity, rate and calculated amount."
      },
      {
        title: "Save Work",
        description:
          "Save the work record and verify that it appears in the work history."
      }
    ],

    example: {
      title: "Tractor Work Example",
      description:
        "You complete tractor work for Ram Kumar.",
      items: [
        { label: "Farmer", value: "Ram Kumar" },
        { label: "Land Area", value: "2 Acres" },
        { label: "Rate", value: "₹2,000 / Acre" }
      ],
      calculation:
        "2 × ₹2,000 = ₹4,000",
      result:
        "Total Work Amount: ₹4,000"
    },

    tips: [
      "Select the correct farmer.",
      "Enter the actual completed work quantity.",
      "Avoid duplicate work entries.",
      "Inform the Owner if you notice an incorrect record."
    ]
  },

  // 5. ADVANCE MANAGEMENT
  {
    id: "advance",
    title: "Advance Management",
    description: "Understand farmer advance records.",
    intro:
      "The Advance section helps you view or record farmer advance transactions depending on the permissions granted by the Owner.",

    steps: [
      {
        title: "Open Farmer Profile",
        description:
          "Find and open the relevant farmer."
      },
      {
        title: "Check Advance Details",
        description:
          "Review the available advance information."
      },
      {
        title: "Record an Advance",
        description:
          "If advance-entry permission is enabled, select the advance option and enter the correct amount."
      },
      {
        title: "Save and Verify",
        description:
          "Save the transaction and verify the updated record."
      }
    ],

    example: {
      title: "Advance Example",
      description:
        "Suppose you have permission to record an advance of ₹1,000 given to Ram Kumar.",
      items: [
        { label: "Farmer", value: "Ram Kumar" },
        { label: "Advance Amount", value: "₹1,000" },
        { label: "Payment Status", value: "Recorded" }
      ],
      result:
        "The advance record can be reviewed according to your access."
    }
  },

  // 6. PAYMENT MANAGEMENT
  {
    id: "payments",
    title: "Payment Management",
    description: "Understand payment-related activities.",
    intro:
      "Drivers can access payment information or record payments when the Owner has enabled the relevant permissions.",

    steps: [
      {
        title: "Open Farmer Profile",
        description:
          "Find the farmer whose payment information you need."
      },
      {
        title: "Review Payment Details",
        description:
          "Check the available payment history and outstanding information."
      },
      {
        title: "Record Payment",
        description:
          "If payment-entry permission is available, enter the actual amount received."
      },
      {
        title: "Verify Transaction",
        description:
          "Check the saved payment record and report any incorrect entry to the Owner."
      }
    ],

    example: {
      title: "Payment Example",
      description:
        "Suppose Ram Kumar gives you ₹2,000 to submit towards his pending payment.",
      items: [
        { label: "Farmer", value: "Ram Kumar" },
        { label: "Amount Received", value: "₹2,000" },
        { label: "Payment Mode", value: "Cash" }
      ],
      result:
        "Record or report the payment according to your assigned permissions."
    },

    tips: [
      "Never record a payment that you have not actually received.",
      "Verify the amount before submitting.",
      "Inform the Owner about payment discrepancies."
    ]
  },

  // 7. DUE SUMMARY
  {
    id: "due-summary",
    title: "Due Summary",
    description: "Understand pending farmer amounts.",
    intro:
      "Due Summary provides information about outstanding farmer balances where this feature is available to your account.",

    steps: [
      {
        title: "Open Due Summary",
        description:
          "Select Due Summary if it is available in your sidebar."
      },
      {
        title: "Search Farmer",
        description:
          "Find the relevant farmer using the available search option."
      },
      {
        title: "Review Pending Amount",
        description:
          "Check the outstanding balance displayed for that farmer."
      },
      {
        title: "Report Issues",
        description:
          "Contact the Owner if you find an incorrect or confusing balance."
      }
    ],

    example: {
      title: "Farmer Due Example",
      description:
        "Suppose Ram Kumar has the following financial records.",
      items: [
        { label: "Work Amount", value: "₹4,000" },
        { label: "Advance", value: "₹1,000" },
        { label: "Payment Received", value: "₹2,000" }
      ],
      calculation:
        "₹4,000 - ₹1,000 - ₹2,000 = ₹1,000",
      result:
        "Remaining Due: ₹1,000"
    }
  },

  // 8. EXPENSE MANAGEMENT
  {
    id: "expenses",
    title: "Expense Management",
    description: "Understand business expense records.",
    intro:
      "Drivers can access or submit expense information if the relevant permissions are enabled.",

    steps: [
      {
        title: "Open Expenses",
        description:
          "Select Expenses if available in your sidebar."
      },
      {
        title: "Add Expense",
        description:
          "If permitted, click Add Expense."
      },
      {
        title: "Enter Details",
        description:
          "Enter the actual amount, expense category, date and description."
      },
      {
        title: "Save Expense",
        description:
          "Review the details and save the record."
      }
    ],

    example: {
      title: "Fuel Expense Example",
      description:
        "Suppose you spend money on diesel for tractor operations.",
      items: [
        { label: "Expense Type", value: "Diesel" },
        { label: "Amount", value: "₹1,500" },
        { label: "Description", value: "Tractor Fuel" }
      ],
      result:
        "The expense can be recorded if you have the required permission."
    }
  },

  // 9. ACCOUNT & SECURITY
  {
    id: "account-security",
    title: "Account & Security",
    description: "Keep your Driver account safe.",
    intro:
      "Follow these guidelines to protect your account and maintain accurate business records.",

    steps: [
      {
        title: "Keep Login Details Private",
        description:
          "Never share your password with unauthorized people."
      },
      {
        title: "Use Your Own Account",
        description:
          "Always perform activities using your assigned Driver account."
      },
      {
        title: "Verify Entries",
        description:
          "Check farmer, work and payment details before submitting."
      },
      {
        title: "Report Problems",
        description:
          "Contact your Owner or Admin if you face an access issue or find incorrect data."
      },
      {
        title: "Logout Safely",
        description:
          "Logout when using a shared or public device."
      }
    ],

    example: {
      title: "Account Safety",
      description:
        "Suppose you are using FarmLedger on a shared device.",
      items: [
        { label: "Before Leaving", value: "Save your work" },
        { label: "Security Step", value: "Logout" },
        { label: "Password", value: "Keep it private" }
      ],
      result:
        "Your account remains protected from unauthorized access."
    }
  }
];

export default driverGuide;
