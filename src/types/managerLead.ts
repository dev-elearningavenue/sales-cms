import { IManagerLead } from "@/models/managerLead";
import { MainStatus, StatusCategory } from "@/constants/statusHierarchy";

export type { IManagerLead, MainStatus, StatusCategory };

export interface ManagerLeadStats {
  total: number;
  today: number;
  week: number;
  month: number;
  byDomain: Record<string, number>;
  quota: {
    daily: number;
    current: number;
  };
}

export interface ManagerLeadStatusUpdateData {
  statusCategory: StatusCategory;
  resolveStatus: string;
  notes?: string;
  followUp?: boolean;
  followUpDate?: Date;
  emailData?: {
    from: string;
    to: string;
    subject: string;
    body: string;
    send: boolean;
  };
}
