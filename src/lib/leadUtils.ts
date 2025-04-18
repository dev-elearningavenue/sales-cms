/**
 * Utility functions for working with lead statuses
 */

// Define status enums
export const LEAD_STATUS = {
  PENDING: "Pending",
  FOLLOW_UP: "Follow Up",
  FOLLOW_UP_1: "Follow Up 1",
  FOLLOW_UP_2: "Follow Up 2",
  FOLLOW_UP_3: "Follow Up 3",
  CLOSED: "Closed"
} as const;

export const RESOLVE_STATUS = {
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CONVERTED: "Converted",
  ASSIGNED_ORDER: "Assigned Order",
  PAID: "Paid"
} as const;

/**
 * Check if a status is a resolved status
 */
export const isResolvedStatus = (status: string): boolean => {
  return [
    RESOLVE_STATUS.RESOLVED,
    RESOLVE_STATUS.CONVERTED,
    RESOLVE_STATUS.ASSIGNED_ORDER,
    RESOLVE_STATUS.PAID
  ].includes(status as any);
};

/**
 * Check if a lead can change status
 */
export const canChangeStatus = (currentStatus: string, currentResolveStatus: string): boolean => {
  // If already in a resolved state, can't change
  if (isResolvedStatus(currentResolveStatus) && currentResolveStatus !== RESOLVE_STATUS.PENDING) {
    return false;
  }
  
  return true;
};

/**
 * Get valid next statuses for a lead
 */
export const getValidNextStatuses = (
  currentStatus: string,
  category: string
): string[] => {
  // Different categories have different allowed statuses
  switch (category) {
    case "Order Creation":
      return [LEAD_STATUS.PENDING, RESOLVE_STATUS.ASSIGNED_ORDER];
      
    case "Contact Us":
    case "Scholarship":
    case "Free SignUp":
    case "Free Study Guide":
      return [LEAD_STATUS.PENDING, RESOLVE_STATUS.RESOLVED];
      
    case "Abandoned Cart":
    case "Custom Lead":
    default:
      // For follow-up statuses, only allow progression forward
      if (currentStatus === LEAD_STATUS.FOLLOW_UP_1) {
        return [LEAD_STATUS.FOLLOW_UP_2, RESOLVE_STATUS.CONVERTED, RESOLVE_STATUS.RESOLVED];
      } 
      else if (currentStatus === LEAD_STATUS.FOLLOW_UP_2) {
        return [LEAD_STATUS.FOLLOW_UP_3, RESOLVE_STATUS.CONVERTED, RESOLVE_STATUS.RESOLVED];
      }
      else if (currentStatus === LEAD_STATUS.FOLLOW_UP_3) {
        return [RESOLVE_STATUS.CONVERTED, RESOLVE_STATUS.RESOLVED];
      }
      else {
        return [
          LEAD_STATUS.PENDING, 
          LEAD_STATUS.FOLLOW_UP_1, 
          LEAD_STATUS.FOLLOW_UP_2, 
          LEAD_STATUS.FOLLOW_UP_3, 
          RESOLVE_STATUS.CONVERTED,
          RESOLVE_STATUS.RESOLVED
        ];
      }
  }
}; 