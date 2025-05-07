export interface SalesPerson {
    id: string;
    name: string | undefined;
    assigned: number;
    contacted: number;
    solved: number;
    closed: number;
    progress: number;
    avatar?: string;
    performance?: "increasing" | "decreasing" | "stable" | string;
    // New category fields
    orderCreations: number;
    abandonedCarts: number;
    contactUs: number;
    freeSignups: number;
    freeStudyGuides: number;
    scholarship: number;
  }