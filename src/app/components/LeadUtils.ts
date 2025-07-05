import { ILead } from "@/types/leads";
import { isResolvedStatus } from "@/lib/leadUtils";

// Helper function to get lead name
export const getLeadName = (lead: ILead): string => {
  if (
    lead.contact_us &&
    typeof lead.contact_us === "object" &&
    (lead.contact_us as any).name
  ) {
    return (lead.contact_us as any).name;
  }

  const dataObjects = [
    lead.free_signup,
    lead.order_creation,
    lead.scholarship,
    lead.custom_lead,
    lead.abandoned_cart,
  ];

  for (const obj of dataObjects) {
    if (
      obj &&
      typeof obj === "object" &&
      "firstName" in obj &&
      "lastName" in obj
    ) {
      return `${(obj as any).firstName} ${(obj as any).lastName || ""}`;
    }
  }

  return "Distinct Lead";
};

// Helper function to get domain labels
export const getDomainLabel = (domain: string): string => {
  switch (domain) {
    case "OOR":
      return "Osha Outreach";
    case "OOC":
      return "Osha Online Center";
    case "OES":
      return "Osha Education School";
    case "FOC":
      return "Free Osha Courses";
    default:
      return domain;
  }
};

// Category colors mapping
export const categoryColors: Record<string, string> = {
  "Contact Us": "bg-blue-500",
  "Order Creation": "bg-green-500",
  "Abandoned Cart": "bg-red-500",
  "Free SignUp": "bg-purple-500",
  "Free Study Guide": "bg-yellow-500",
  "Custom Lead": "bg-indigo-500",
  "Unpaid Training": "bg-teal-500",
  Scholarship: "bg-amber-500",
};

// Get the follow-up level for display purposes
export const getFollowUpDisplayStatus = (lead: ILead): string => {
  if (
    lead.status === "Follow Up" &&
    lead.next_follow_up &&
    Array.isArray(lead.next_follow_up)
  ) {
    const count = lead.next_follow_up.length;
    return `Follow Up ${count}`;
  }
  return lead.status || "Pending";
};

// Fix the hasFollowUp function to properly check for follow-ups
export const hasFollowUp = (lead: ILead): boolean => {
  return !!(
    lead.next_follow_up &&
    Array.isArray(lead.next_follow_up) &&
    lead.next_follow_up.length > 0
  );
};

// Get the count of follow-ups for a lead
export const getFollowUpCount = (lead: ILead): number => {
  if (!lead.next_follow_up || !Array.isArray(lead.next_follow_up)) {
    return 0;
  }
  return lead.next_follow_up.length;
};

// Update the getStatusOptionsForCategory function to use the helpers
export const getStatusOptionsForCategory = (
  category: string,
  lead?: ILead
): string[] => {
  // Basic options by category
  let options: string[];

  switch (category) {
    case "Order Creation":
      options = ["Pending", "Assigned Order"];
      break;
    case "Contact Us":
      options = ["Pending", "Resolved"];
      break;
    case "Scholarship":
    case "Free SignUp":
    case "Free Study Guide":
      options = ["Pending", "Resolved"];
      break;
    default:
      options = [
        "Pending",
        "Follow Up 1",
        "Follow Up 2",
        "Follow Up 3",
        "Converted",
        "Resolved",
      ];
      break;
  }

  // If lead exists and we need to modify options based on status
  if (lead) {
    const currentStatus = lead.status;

    // If status is not pending, remove pending option
    if (currentStatus !== "Pending") {
      options = options.filter((opt) => opt !== "Pending");
    }

    // Handle follow-up status progression
    if (currentStatus === "Follow Up 1") {
      // In Follow Up 1, remove Follow Up 1 option (since we're already here)
      options = options.filter((opt) => opt !== "Follow Up 1");
    } else if (currentStatus === "Follow Up 2") {
      // In Follow Up 2, remove both Follow Up 1 and 2 options
      options = options.filter(
        (opt) => opt !== "Follow Up 1" && opt !== "Follow Up 2"
      );
    } else if (currentStatus === "Follow Up 3") {
      // In Follow Up 3, remove all Follow Up options
      options = options.filter((opt) => !opt.startsWith("Follow Up"));
    } else if (
      currentStatus === "Follow Up" &&
      lead.next_follow_up &&
      Array.isArray(lead.next_follow_up)
    ) {
      // Legacy "Follow Up" status with next_follow_up array
      const count = lead.next_follow_up.length;

      // Remove previous follow-up options
      if (count >= 1) options = options.filter((opt) => opt !== "Follow Up 1");
      if (count >= 2) options = options.filter((opt) => opt !== "Follow Up 2");
      if (count >= 3)
        options = options.filter((opt) => !opt.startsWith("Follow Up"));
    }
  }

  return options;
};

// Add this utility function to check if status options should be disabled
export const isStatusDisabled = (lead: ILead, option: string): boolean => {
  // Disable if lead is resolved
  if (
    lead.resolve_status &&
    isResolvedStatus(lead.resolve_status) &&
    lead.resolve_status !== "Pending"
  ) {
    return true;
  }

  // Disable going backwards in follow-up flow
  if (
    lead.status &&
    lead.status.startsWith("Follow Up") &&
    option.startsWith("Follow Up")
  ) {
    const currentLevel = parseInt(lead.status.split(" ")[2] || "0", 10) || 0;
    const optionLevel = parseInt(option.split(" ")[2] || "0", 10) || 0;

    if (optionLevel < currentLevel) {
      return true;
    }
  }

  return false;
};

// Check if a lead has had 3 or more follow-ups
export const hasThreeFollowUps = (lead: ILead): boolean => {
  if (!lead.next_follow_up) return false;
  if (!Array.isArray(lead.next_follow_up)) return false;
  return lead.next_follow_up.length >= 3;
};

// Get the latest note for a lead
export const getLatestNote = (lead: ILead) => {
  if (!lead.notes || !Array.isArray(lead.notes) || lead.notes.length === 0) {
    return null;
  }

  // Sort notes by creation date and get the latest
  const sortedNotes = [...lead.notes].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return sortedNotes[0];
}; 