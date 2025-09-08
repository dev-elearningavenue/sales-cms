import { ICompanyLead } from "@/models/companyLead";

export type { ICompanyLead };

export interface CompanyLeadData {
  companyName: string;
  companyEmail: string;
  contactNo: string;
  address: string;
  companyWebsite?: string;
  socials?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };
  state: string;
  city?: string;
  zipCode?: string;
  country?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  notes?: string;
  status?: "new" | "contacted" | "qualified" | "converted" | "lost";
  assignedTo?: string;
  assignedAt?: Date;
  nextFollowUp?: Date;
  followUpNotes?: string;
  conversionValue?: number;
  source: string;
  next_follow_up?: Array<{
    date: Date;
    contact_type: ("chat" | "email" | "call")[];
    notes?: string;
  }>;
}

export interface CSVUploadResponse {
  success: boolean;
  message: string;
  totalRecords: number;
  importedRecords: number;
  failedRecords: number;
  errors?: string[];
  importedLeads?: ICompanyLead[];
}

export interface CompanyLeadFilter {
  status?: string;
  state?: string;
  domain?: string;
  assignedTo?: string;
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CompanyLeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  byState: Record<string, number>;
  byDomain: Record<string, number>;
}
