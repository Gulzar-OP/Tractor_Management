
export const adminGuide = [
  // 1. GETTING STARTED
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn how to use your Admin account.",
    intro:
      "The Admin account provides access to administrative features for managing users and monitoring the FarmLedger system.",

    steps: [
      {
        title: "Login as Admin",
        description:
          "Open FarmLedger and enter your Admin login credentials."
      },
      {
        title: "Explore Admin Dashboard",
        description:
          "Review the administrative information and available system statistics."
      },
      {
        title: "Understand Admin Permissions",
        description:
          "Explore the available management options according to your Admin permissions."
      }
    ],

    example: {
      title: "Admin Account Example",
      description:
        "Suppose you are responsible for managing the FarmLedger platform.",
      items: [
        { label: "Account Role", value: "Admin" },
        { label: "Main Responsibility", value: "System Management" },
        { label: "Access", value: "Administrative Features" }
      ],
      result:
        "You can manage the system using the permissions assigned to your account."
    }
  },

  // 2. ADMIN DASHBOARD
  {
    id: "dashboard",
    title: "Admin Dashboard",
    description: "Monitor the overall system.",
    intro:
      "The Admin Dashboard provides an overview of the system information and management activities available to administrators.",

    steps: [
      {
        title: "Open Dashboard",
        description:
          "Navigate to Dashboard after logging in."
      },
      {
        title: "Review System Statistics",
        description:
          "Check the available user, owner and driver statistics."
      },
      {
        title: "Monitor Activities",
        description:
          "Review the administrative information and activities displayed on the dashboard."
      },
      {
        title: "Navigate to Management Modules",
        description:
          "Use the sidebar to access the available administrative modules."
      }
    ],

    example: {
      title: "System Overview Example",
      description:
        "Suppose you manage a platform with multiple business owners.",
      items: [
        { label: "Registered Owners", value: "As displayed" },
        { label: "Registered Drivers", value: "As displayed" },
        { label: "System Users", value: "As displayed" }
      ],
      result:
        "You can monitor the available system information from one dashboard."
    }
  },

  // 3. OWNER MANAGEMENT
  {
    id: "owners",
    title: "Owner Management",
    description: "Manage business owner accounts.",
    intro:
      "Owner Management allows administrators to manage owner accounts and their access to the platform.",

    steps: [
      {
        title: "Open Owner Management",
        description:
          "Select the Owners section from the Admin sidebar, if available."
      },
      {
        title: "View Owner List",
        description:
          "Review the registered owner accounts."
      },
      {
        title: "Add New Owner",
        description:
          "If enabled, select Add Owner and enter the required account details."
      },
      {
        title: "Update Owner Details",
        description:
          "Open an owner record and update permitted information."
      },
      {
        title: "Manage Owner Access",
        description:
          "Use the available account-management options to control owner access."
      }
    ],

    example: {
      title: "New Owner Example",
      description:
        "Suppose a new business owner wants to register on FarmLedger.",
      items: [
        { label: "Owner Name", value: "Rahul Kumar" },
        { label: "Business", value: "Tractor Services" },
        { label: "Role", value: "Owner" }
      ],
      result:
        "The owner account can be created or managed through the available Admin controls."
    },

    tips: [
      "Verify owner details before creating an account.",
      "Do not share account credentials.",
      "Only modify accounts when authorized."
    ]
  },

  // 4. DRIVER MANAGEMENT
  {
    id: "drivers",
    title: "Driver Management",
    description: "Manage driver accounts and access.",
    intro:
      "Driver Management helps administrators manage driver accounts and their access to the system.",

    steps: [
      {
        title: "Open Driver Management",
        description:
          "Select Drivers from the Admin sidebar."
      },
      {
        title: "View Driver List",
        description:
          "Review the available driver accounts."
      },
      {
        title: "Add Driver",
        description:
          "If supported, click Add Driver and enter the required information."
      },
      {
        title: "Assign Driver",
        description:
          "Associate the driver with the appropriate business owner using the available assignment option."
      },
      {
        title: "Update Driver Details",
        description:
          "Edit permitted driver information when necessary."
      },
      {
        title: "Manage Driver Access",
        description:
          "Use the available controls to manage driver account access."
      }
    ],

    example: {
      title: "Driver Assignment Example",
      description:
        "Suppose Rahul Kumar owns a tractor business and hires a driver.",
      items: [
        { label: "Owner", value: "Rahul Kumar" },
        { label: "Driver", value: "Amit Kumar" },
        { label: "Relationship", value: "Driver under Owner" }
      ],
      result:
        "The driver can work under the appropriate owner account."
    }
  },

  // 5. USER MANAGEMENT
  {
    id: "users",
    title: "User Management",
    description: "Manage platform user accounts.",
    intro:
      "User Management provides administrative controls for managing registered accounts and their roles.",

    steps: [
      {
        title: "Open User Management",
        description:
          "Navigate to the Users section if available."
      },
      {
        title: "View Registered Users",
        description:
          "Review the user records available to your Admin account."
      },
      {
        title: "Check User Roles",
        description:
          "Verify whether an account belongs to an Owner, Driver or Admin."
      },
      {
        title: "Update User Information",
        description:
          "Modify permitted account details when required."
      },
      {
        title: "Manage User Access",
        description:
          "Use the available controls to manage user access."
      }
    ],

    example: {
      title: "User Role Example",
      description:
        "A platform contains different types of accounts.",
      items: [
        { label: "Rahul Kumar", value: "Owner" },
        { label: "Amit Kumar", value: "Driver" },
        { label: "System Manager", value: "Admin" }
      ],
      result:
        "Each account receives access according to its assigned role."
    }
  },

  // 6. FARMER MANAGEMENT
  {
    id: "farmers",
    title: "Farmer Records",
    description: "Understand farmer record management.",
    intro:
      "Depending on administrative permissions, you may be able to review farmer records associated with different business owners.",

    steps: [
      {
        title: "Open Farmer Records",
        description:
          "Select the farmer management section if available."
      },
      {
        title: "Search Farmer",
        description:
          "Use supported search fields to find a farmer record."
      },
      {
        title: "Review Farmer Details",
        description:
          "Check the available farmer information."
      },
      {
        title: "Verify Ownership",
        description:
          "Check which business owner is associated with the farmer record."
      },
      {
        title: "Manage Records",
        description:
          "Only perform permitted administrative actions on farmer records."
      }
    ],

    example: {
      title: "Farmer Record Example",
      description:
        "Suppose you need to review a farmer record.",
      items: [
        { label: "Farmer", value: "Ram Kumar" },
        { label: "Business Owner", value: "Rahul Kumar" },
        { label: "Record Type", value: "Farmer" }
      ],
      result:
        "You can review the record and its associated ownership where access is available."
    }
  },

  // 7. SYSTEM MONITORING
  {
    id: "monitoring",
    title: "System Monitoring",
    description: "Monitor administrative activities.",
    intro:
      "System monitoring helps administrators review the information and operational status exposed by the application.",

    steps: [
      {
        title: "Review System Information",
        description:
          "Check the statistics and information available on the Admin Dashboard."
      },
      {
        title: "Review Account Activities",
        description:
          "Inspect available user and account-related activity records."
      },
      {
        title: "Identify Problems",
        description:
          "Look for unusual account activity or reported operational issues."
      },
      {
        title: "Take Administrative Action",
        description:
          "Use the appropriate authorized management controls to resolve issues."
      }
    ],

    example: {
      title: "Account Issue Example",
      description:
        "Suppose a driver reports that they cannot access their account.",
      items: [
        { label: "Reported By", value: "Driver" },
        { label: "Issue", value: "Login Problem" },
        { label: "Admin Action", value: "Verify Account" }
      ],
      result:
        "Investigate the issue and take an authorized corrective action."
    }
  },

  // 8. SECURITY
  {
    id: "security",
    title: "Security & Permissions",
    description: "Maintain platform security.",
    intro:
      "Administrative access should be used responsibly to protect business and user information.",

    steps: [
      {
        title: "Protect Admin Credentials",
        description:
          "Never share your Admin password or login credentials."
      },
      {
        title: "Verify Account Changes",
        description:
          "Check account details before changing roles or access."
      },
      {
        title: "Respect User Data",
        description:
          "Only access information when required for authorized administrative work."
      },
      {
        title: "Review Permissions",
        description:
          "Ensure users have only the access necessary for their responsibilities."
      },
      {
        title: "Logout Safely",
        description:
          "Always logout when using a shared device."
      }
    ],

    example: {
      title: "Permission Management Example",
      description:
        "Suppose a driver should not have administrative access.",
      items: [
        { label: "User", value: "Amit Kumar" },
        { label: "Correct Role", value: "Driver" },
        { label: "Admin Access", value: "Not Authorized" }
      ],
      result:
        "Maintain the correct role and prevent unauthorized access."
    },

    tips: [
      "Never share Admin credentials.",
      "Verify changes before saving.",
      "Avoid unauthorized access to business records."
    ]
  }
];

export default adminGuide;
