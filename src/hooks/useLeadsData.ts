import { useState, useEffect } from "react";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";
import { getLeadName } from "@/components/LeadUtils";

// Define type for sort configuration
export interface SortConfig {
  field: 'createdAt' | 'updatedAt' | 'assignedAt' | 'category' | 'domain';
  direction: 'asc' | 'desc';
}

// Define type for filter configuration
export interface FilterConfig {
  domain: string;
  category: string;
  status: string;
}

export const useLeadsData = () => {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useApp();
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const fetchMyLeads = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        // Don't show loading state for refresh
      } else {
        setLoading(true);
      }
      
      const res = await fetch("/api/my-leads");
      const data = await res.json();

      if (data.leads) {
        setLeads(data.leads);
        setLastFetchTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching my leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLeadsUpdates = async () => {
    // If no lastFetchTime, do a complete fetch first
    if (!lastFetchTime) {
      await fetchMyLeads();
      return;
    }

    try {
      const timestamp = lastFetchTime.toISOString();
      const res = await fetch(`/api/my-leads/updates?since=${timestamp}`);
      
      // Check for auth errors
      if (res.status === 401) {
        console.log("Auth error in fetchMyLeadsUpdates, user needs to re-login");
        return;
      }
      
      const data = await res.json();

      if (data.newLeads && data.newLeads.length > 0) {
        // Add the new leads to the state
        setLeads((prevLeads) => {
          // Filter out any duplicates by ID
          const existingIds = new Set(prevLeads.map((lead) => lead._id));
          const uniqueNewLeads = data.newLeads.filter(
            (lead: ILead) => !existingIds.has(lead._id)
          );

          // Notify for each new assigned lead
          uniqueNewLeads.forEach((lead: ILead) => {
            addNotification({
              message: `New lead assigned to you: ${getLeadName(lead)}`,
              read: false,
              type: "lead",
              leadId: lead._id,
            });
          });

          // Update last fetch time
          setLastFetchTime(new Date());

          // Return updated leads array with new leads at the top
          return [...uniqueNewLeads, ...prevLeads];
        });
      } else {
        // No new leads, just update the timestamp
        setLastFetchTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching my lead updates:", error);
    }
  };

  // Fetch a specific lead by ID
  const fetchLeadById = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();

      if (res.ok && data.lead) {
        // Update the lead in our state
        setLeads((prevLeads) => {
          // Check if we already have this lead
          const existingIndex = prevLeads.findIndex((l) => l._id === leadId);

          if (existingIndex >= 0) {
            // Update existing lead
            const newLeads = [...prevLeads];
            newLeads[existingIndex] = data.lead;
            return newLeads;
          } else {
            // This is a new lead assigned to the user
            return [data.lead, ...prevLeads];
          }
        });

        // Notify about the new assignment if this is a new lead
        if (!leads.some((l) => l._id === leadId)) {
          addNotification({
            message: `New lead assigned to you: ${getLeadName(data.lead)}`,
            read: false,
            type: "lead",
            leadId: data.lead._id,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
    }
  };

  // Apply sorting to leads
  const getSortedLeads = (leads: ILead[], sort: SortConfig) => {
    return [...leads].sort((a, b) => {
      if (sort.field === "createdAt") {
        const dateA = new Date(a.createdAt || "").getTime();
        const dateB = new Date(b.createdAt || "").getTime();
        return sort.direction === "desc" ? dateB - dateA : dateA - dateB;
      }

      if (sort.field === "updatedAt") {
        const dateA = new Date(a.updatedAt || a.createdAt || "").getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || "").getTime();
        return sort.direction === "desc" ? dateB - dateA : dateA - dateB;
      }

      if (sort.field === "assignedAt") {
        const dateA = new Date(a.assignedAt || a.createdAt || "").getTime();
        const dateB = new Date(b.assignedAt || b.createdAt || "").getTime();
        return sort.direction === "desc" ? dateB - dateA : dateA - dateB;
      }

      if (sort.field === "category") {
        const categoryA = a.category || "";
        const categoryB = b.category || "";
        return sort.direction === "desc"
          ? categoryB.localeCompare(categoryA)
          : categoryA.localeCompare(categoryB);
      }

      if (sort.field === "domain") {
        const domainA = a.domain || "";
        const domainB = b.domain || "";
        return sort.direction === "desc"
          ? domainB.localeCompare(domainA)
          : domainA.localeCompare(domainB);
      }

      return 0;
    });
  };

  // Apply filters to leads
  const getFilteredLeads = (leads: ILead[], filters: FilterConfig) => {
    return leads.filter((lead) => {
      const domainMatch = !filters.domain || lead.domain === filters.domain;
      const categoryMatch =
        !filters.category || lead.category === filters.category;
      const statusMatch = !filters.status || lead.status === filters.status;

      return domainMatch && categoryMatch && statusMatch;
    });
  };

  return {
    leads,
    setLeads,
    loading,
    setLoading,
    fetchMyLeads,
    fetchMyLeadsUpdates,
    fetchLeadById,
    getSortedLeads,
    getFilteredLeads,
    lastFetchTime,
  };
}; 