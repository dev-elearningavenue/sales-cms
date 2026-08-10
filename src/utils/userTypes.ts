/** CMS login roles (User.user_type). Customer LMS types (2/4) are separate. */
export const USER_TYPE = {
  ADMIN: 1,
  MANAGER: 2,
  SALES_AGENT: 3,
  LEARNER: 4,
  PRE_SALE: 5,
} as const;

export type CmsUserType = (typeof USER_TYPE)[keyof typeof USER_TYPE];

export const isAdminOrManager = (t?: number | null): boolean =>
  t === USER_TYPE.ADMIN || t === USER_TYPE.MANAGER;

export const isSalesAgent = (t?: number | null): boolean =>
  t === USER_TYPE.SALES_AGENT;

export const isPreSale = (t?: number | null): boolean =>
  t === USER_TYPE.PRE_SALE;

/** Sales agent only: limited delete/assign UI and actions on leads */
export const isRestrictedAgent = (t?: number | null): boolean =>
  isSalesAgent(t);

/** Admin/Manager: full invoice list, mark-paid, delete, agents sales */
export const canManageInvoices = (t?: number | null): boolean =>
  isAdminOrManager(t);

/** Sales agent + Pre Sale: own invoices only, view-only (no paid/delete) */
export const isOwnInvoicesOnly = (t?: number | null): boolean =>
  isSalesAgent(t) || isPreSale(t);
