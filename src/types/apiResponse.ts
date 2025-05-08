import { SalesPerson } from "./salesPerson";

export interface ApiResponse {
  salesPeople: SalesPerson[];
  totals: {
    assigned: number;
    contacted: number;
    solved: number;
    closed: number;
    orderCreations: number;
    abandonedCarts: number;
    contactUs: number;
    freeSignups: number;
    freeStudyGuides: number;
    scholarship: number;
  };
  lastUpdated?: string;
  salesperson?: SalesPerson;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
} 