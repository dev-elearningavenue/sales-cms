// Status Hierarchy for Company Leads System

export type MainStatus = "pending" | "processing" | "resolved" | "closed" | "follow_up";
export type StatusCategory = "Interested" | "Invalid Contact" | "Delayed Interest" | "Rejection";

// Main status definitions
export const MAIN_STATUSES: Record<MainStatus, string> = {
  pending: "Pending",
  processing: "Processing", 
  resolved: "Resolved",
  closed: "Closed",
  follow_up: "Follow Up"
};

// Status categories (call outcomes)
export const STATUS_CATEGORIES: Record<StatusCategory, string> = {
  "Interested": "Interested",
  "Invalid Contact": "Invalid Contact", 
  "Delayed Interest": "Delayed Interest",
  "Rejection": "Rejection"
};

// Resolve statuses under each category
export const RESOLVE_STATUSES: Record<StatusCategory, string[]> = {
  "Interested": [
    "Send Quote",
    "Send Details",
    "Schedule Call",
    "Trial Training",
    "Schedule Meeting", 
    "Email, I'll forward",
    "Purchased Training",
    "Already Our Customer",
  ],
  "Invalid Contact": [
    "Number not found",
    "Not Interested", 
    "Company closed"
  ],
  "Delayed Interest": [
    "Call me later",
    "Concern person N.A",
    "Already engaged with other provider", 
    "LVM"
  ],
  "Rejection": [
    "Hangup"
  ]
};

// Modal configuration for each category
export const CATEGORY_MODAL_CONFIG: Record<StatusCategory, {
  showEmail: boolean;
  showFollowUp: boolean;
  showNotes: boolean;
  requireEmail?: boolean;
}> = {
  "Interested": {
    showEmail: true,
    showFollowUp: true, 
    showNotes: true,
    requireEmail: false
  },
  "Invalid Contact": {
    showEmail: false,
    showFollowUp: false,
    showNotes: true
  },
  "Delayed Interest": {
    showEmail: true,
    showFollowUp: true,
    showNotes: true,
    requireEmail: false
  },
  "Rejection": {
    showEmail: false,
    showFollowUp: false,
    showNotes: true
  }
};

// Step mapping based on the flow image
export const STEP_ACTIONS: Record<StatusCategory, Record<string, string>> = {
  "Interested": {
    "Send Quote": "Send Email",
    "Send Details": "Send Email",
    "Trial Training": "Send Email",
    "Purchased Training": "Send Email",
    "Email, I'll forward": "Send Email",
    "Schedule Call": "Send Email & Schedule Call",
    "Schedule Meeting": "Send Email & Schedule Meeting", 
    "Already Our Customer": "Send Email as good will and ask for requirements"
  },
  "Invalid Contact": {
    "Number not found": "No Email",
    "Not Interested": "Email",
    "Company closed": "Company closed"
  },
  "Delayed Interest": {
    "Call me later": "Follow up (Send Email)",
    "Concern person N.A": "Follow up (Send Email)", 
    "Already engaged with other provider": "Follow up (send email)",
    "LVM": "Follow Up"
  },
  "Rejection": {
    "Hangup": "Email not required"
  }
};

// Helper functions
export const getResolveStatusesForCategory = (category: StatusCategory): string[] => {
  return RESOLVE_STATUSES[category] || [];
};

export const getModalConfigForCategory = (category: StatusCategory) => {
  return CATEGORY_MODAL_CONFIG[category];
};

export const getActionForResolveStatus = (category: StatusCategory, resolveStatus: string): string => {
  return STEP_ACTIONS[category]?.[resolveStatus] || "";
};

export const shouldShowEmailOption = (category: StatusCategory): boolean => {
  return CATEGORY_MODAL_CONFIG[category]?.showEmail || false;
};

export const shouldShowFollowUpOption = (category: StatusCategory): boolean => {
  return CATEGORY_MODAL_CONFIG[category]?.showFollowUp || false;
};
