"use client";
import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { Customer, Field } from "@/components/Customer";
import CourseInfo from "@/components/CourseInfo";
// import mongoose from "mongoose";
import LeadNotes from "../components/LeadNotes";

// Replace the STATUS_OPTIONS constant with a function to get category-specific statuses
const getStatusOptionsForCategory = (
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
    default:
      options = ["Pending", "Follow Up", "Converted", "Resolved"];
      break;
  }

  // If lead has follow-ups and its status is "Follow Up", add "Add Follow-up" option
  if (
    lead &&
    lead.next_follow_up &&
    Array.isArray(lead.next_follow_up) &&
    lead.next_follow_up.length > 0 &&
    lead.status === "Follow Up"
  ) {
    // Replace "Follow Up" with "Add Follow-up"
    return options.map((opt) => (opt === "Follow Up" ? "Add Follow-up" : opt));
  }

  // If lead status is not Pending anymore, remove Pending from options
  if (lead && lead.status !== "Pending") {
    return options.filter((opt) => opt !== "Pending");
  }

  return options;
};

// Domain mapping for labels
const DOMAIN_LABELS = {
  OOR: "Osha Outreach",
  OOC: "Osha Online Center",
  OES: "Osha Education School",
};

// Add type definition for contact type
type ContactType = "email" | "call" | "chat";

const MyLeads = () => {
  // State management
  const [leads, setLeads] = useState<ILead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const { session, fetchSession, addNotification } = useApp();
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // Filtering and sorting state
  const [filters, setFilters] = useState({
    domain: "",
    category: "",
    status: "",
  });
  const [sort, setSort] = useState<{
    field: string;
    direction: "asc" | "desc";
  }>({
    field: "createdAt",
    direction: "desc",
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Selected lead for modal view
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add new state for status modals
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [conversionValue, setConversionValue] = useState<number | undefined>();
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(
    null
  );

  // Add state for notes modal
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLeadForNotes, setSelectedLeadForNotes] =
    useState<ILead | null>(null);

  // Update state for follow-up data
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [followUpNote, setFollowUpNote] = useState("");

  // Add state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchMyLeads();

      // Set up polling for assigned lead updates
      const intervalId = setInterval(() => {
        fetchMyLeadsUpdates();
      }, 20000); // Check for updates every 20 seconds

      return () => clearInterval(intervalId);
    }
  }, [session]);

  const fetchMyLeads = async () => {
    try {
      setLoading(true);
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
    if (!lastFetchTime || !session) return;

    try {
      const timestamp = lastFetchTime.toISOString();
      const res = await fetch(`/api/my-leads/updates?since=${timestamp}`);
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
      }
    } catch (error) {
      console.error("Error fetching my lead updates:", error);
    }
  };

  // Helper function to get lead name
  const getLeadName = (lead: ILead): string => {
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

    return "New Lead";
  };

  // Apply sorting to leads
  const getSortedLeads = (leads: ILead[]) => {
    return [...leads].sort((a, b) => {
      if (sort.field === "createdAt") {
        const dateA = new Date(a.createdAt || "").getTime();
        const dateB = new Date(b.createdAt || "").getTime();
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
  const getFilteredLeads = (leads: ILead[]) => {
    return leads.filter((lead) => {
      const domainMatch = !filters.domain || lead.domain === filters.domain;
      const categoryMatch =
        !filters.category || lead.category === filters.category;
      const statusMatch = !filters.status || lead.status === filters.status;

      return domainMatch && categoryMatch && statusMatch;
    });
  };

  // Process leads with sorting and filtering
  const processedLeads = getFilteredLeads(getSortedLeads(leads));

  // Pagination calculation
  const totalLeadCount = processedLeads.length;
  const totalPages = Math.ceil(totalLeadCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalLeadCount);
  const currentLeads = processedLeads.slice(startIndex, endIndex);

  // Helper functions
  // Fix the hasFollowUp function to properly check for follow-ups
  const hasFollowUp = (lead: ILead) => {
    return (
      lead.next_follow_up &&
      Array.isArray(lead.next_follow_up) &&
      lead.next_follow_up.length > 0
    );
  };

  // Get the count of follow-ups for a lead
  const getFollowUpCount = (lead: ILead) => {
    if (!lead.next_follow_up || !Array.isArray(lead.next_follow_up)) {
      return 0;
    }
    return lead.next_follow_up.length;
  };

  // Update the getStatusOptionsForCategory function to use the helpers
  const getStatusOptionsForCategory = (
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
      default:
        options = [
          "Pending",
          "Follow Up 1",
          "Follow Up 2",
          "Follow Up 3",
          "Converted",
        ];
        break;
    }

    // If lead exists and we need to modify options based on status
    if (lead) {
      // If lead status is not Pending anymore, remove Pending from options
      if (lead.status !== "Pending") {
        options = options.filter((opt) => opt !== "Pending");
      }

      // If lead already has follow-ups, show appropriate next follow-up option
      if (lead.status === "Follow Up" && hasFollowUp(lead)) {
        const count = getFollowUpCount(lead);

        // If we have 3+ follow-ups, don't allow more
        if (count >= 3) {
          // Replace "Follow Up" with special note that max follow-ups reached
          return options.map((opt) =>
            opt === "Follow Up" ? "Max Follow-ups Reached" : opt
          );
        } else {
          // Replace "Follow Up" with the next numbered follow-up
          return options.map((opt) =>
            opt === "Follow Up" ? `Follow-up #${count + 1}` : opt
          );
        }
      }
    }

    return options;
  };

  // Modify the handleStatusChange function to handle follow-up numbering
  const handleStatusChange = (leadId: string, newStatus: string) => {
    // Find the lead
    const lead = leads.find((l) => l._id === leadId);
    if (!lead) return;

    // Handle special status types
    let actualStatus = newStatus;

    // Convert "Follow-up #X" to "Follow Up" for backend
    if (newStatus.startsWith("Follow-up #")) {
      actualStatus = "Follow Up";
    }

    // Don't process if it's the "Max Follow-ups Reached" non-selectable option
    if (newStatus === "Max Follow-ups Reached") {
      return;
    }

    // Store the lead ID and pending status
    setCurrentLeadId(leadId);
    setPendingStatusChange(actualStatus);

    // Show appropriate modal based on status
    if (actualStatus === "Converted") {
      setShowConversionModal(true);
    } else if (actualStatus === "Follow Up") {
      setShowFollowUpModal(true);
    } else {
      // For other statuses, prompt for a note (optional)
      setShowNoteModal(true);
    }
  };

  // Handle selecting/deselecting contact types
  const toggleContactType = (type: ContactType) => {
    if (contactTypes.includes(type)) {
      setContactTypes(contactTypes.filter((t) => t !== type));
    } else {
      setContactTypes([...contactTypes, type]);
    }
  };

  // Apply status change with additional data
  const applyStatusChange = async () => {
    if (!currentLeadId || !pendingStatusChange) return;

    try {
      // Prepare data based on status
      const requestData: any = {
        leadId: currentLeadId,
        newStatus: pendingStatusChange,
      };

      // Add additional data based on selected status
      if (pendingStatusChange === "Converted" && conversionValue) {
        requestData.conversionValue = conversionValue;
      }

      if (pendingStatusChange === "Follow Up" && followUpDate) {
        requestData.followUpDate = followUpDate;
        requestData.contactTypes = contactTypes as (
          | "email"
          | "call"
          | "chat"
        )[];
        requestData.followUpNote = followUpNote;
      }

      // Add note if provided
      if (newNote.trim()) {
        requestData.note = newNote.trim();
      }

      // Optimistically update the UI
      setLeads((prevLeads) =>
        prevLeads.map((lead) => {
          if (lead._id === currentLeadId) {
            const updatedLead = { ...lead, status: pendingStatusChange };

            // Additional updates based on status type
            if (pendingStatusChange === "Converted" && conversionValue) {
              updatedLead.conversion_value = conversionValue;
            }

            if (pendingStatusChange === "Resolved") {
              updatedLead.resolved = true;
              updatedLead.resolve_status = "Resolved";
            }

            if (pendingStatusChange === "Follow Up" && followUpDate) {
              const newFollowUp = {
                date: new Date(followUpDate),
                contact_type: contactTypes as ("email" | "call" | "chat")[],
                notes: followUpNote,
              };

              if (
                !updatedLead.next_follow_up ||
                !Array.isArray(updatedLead.next_follow_up)
              ) {
                updatedLead.next_follow_up = [newFollowUp];
              } else {
                updatedLead.next_follow_up = [
                  ...updatedLead.next_follow_up,
                  newFollowUp,
                ];
              }
            }

            // Add note if provided
            if (newNote.trim()) {
              const newNoteObj = {
                text: newNote,
                created_at: new Date(),
              };

              if (!updatedLead.notes || !Array.isArray(updatedLead.notes)) {
                updatedLead.notes = [newNoteObj as any];
              } else {
                updatedLead.notes = [...updatedLead.notes, newNoteObj as any];
              }
            }

            return updatedLead;
          }
          return lead;
        })
      );

      // Send request to update status
      const res = await fetch("/api/my-leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      // Reset form state
      closeAllModals();
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert the optimistic update
      fetchMyLeads();
    }
  };

  // Helper to close all modals and reset form state
  const closeAllModals = () => {
    setShowConversionModal(false);
    setShowFollowUpModal(false);
    setShowNoteModal(false);
    setCurrentLeadId(null);
    setPendingStatusChange(null);
    setConversionValue(undefined);
    setFollowUpDate("");
    setNewNote("");
    setContactTypes([]);
    setFollowUpNote("");
  };

  // Get the latest note for a lead
  const getLatestNote = (lead: ILead) => {
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

  // Check if a lead has had 3 or more follow-ups
  const hasThreeFollowUps = (lead: ILead) => {
    return (
      lead.next_follow_up &&
      Array.isArray(lead.next_follow_up) &&
      lead.next_follow_up.length >= 3
    );
  };

  // Handle sorting changes
  const handleSortChange = (field: string) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Handle filter changes
  const handleFilterChange = (
    filterType: keyof typeof filters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      domain: "",
      category: "",
      status: "",
    });
  };

  // Get domain label
  const getDomainLabel = (domain: string) => {
    return DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS] || domain;
  };

  // View lead details
  const handleViewLead = (leadIdOrLead: string | ILead) => {
    if (typeof leadIdOrLead === "string") {
      // Find the lead by ID
      const lead = leads.find((l) => l._id === leadIdOrLead);
      if (lead) {
        setSelectedLead(lead);
        setIsModalOpen(true);
      }
    } else {
      // Use the lead object directly
      setSelectedLead(leadIdOrLead);
      setIsModalOpen(true);
    }
  };

  // Handle viewing notes
  const handleViewNotes = (lead: ILead) => {
    setSelectedLeadForNotes(lead);
    setShowNotesModal(true);
  };

  // Generate pagination buttons
  const getPaginationButtons = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  };

  const categoryFieldMapping = {
    "Order Creation": ["firstName", "lastName", "email", "phone"],
    "Abandoned Cart": ["name", "customerEmail", "customerPhone"],
    "Free SignUp": ["firstName", "lastName", "email"],
    Scholarship: ["firstName", "lastName", "email"],
  };

  const categoryColors: Record<string, string> = {
    "Abandoned Cart": "bg-red-500",
    "Order Creation": "bg-green-500",
    "Contact Us": "bg-blue-500",
    "Free SignUp": "bg-purple-500",
    "Free Study Guide": "bg-yellow-500",
    "Custom Lead": "bg-indigo-500",
    Scholarship: "bg-amber-500",
  };

  // New function to handle lead deletion
  const handleDeleteLead = (leadId: string) => {
    setLeadToDelete(leadId);
    setShowDeleteModal(true);
  };

  // Confirm deletion and call API
  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;

    try {
      const res = await fetch(`/api/leads?leadId=${leadToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete lead");
      }

      // Remove lead from state
      setLeads((prevLeads) =>
        prevLeads.filter((lead) => lead._id !== leadToDelete)
      );
      setShowDeleteModal(false);
      setLeadToDelete(null);

      // Show success notification
      addNotification({
        message: "Lead deleted successfully",
        type: "info",
        read: false,
      });
    } catch (error) {
      console.error("Error deleting lead:", error);
      addNotification({
        message: "Failed to delete lead",
        type: "warning",
        read: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {loading ? (
        <LoadingSkeleton component="my leads" />
      ) : (
        <div className="bg-white w-full rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 w-full">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">My Leads</h1>
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-medium">
                  {startIndex + 1}-{endIndex}
                </span>{" "}
                of <span className="font-medium">{totalLeadCount}</span> leads
              </div>
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>
                  {showFiltersPanel ? "Hide Filters" : "Show Filters"}
                </span>
              </button>
            </div>

            {/* Filters and Pagination Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
              {(filters.domain || filters.category || filters.status) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Filters Panel */}
            {showFiltersPanel && (
              <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-normal text-gray-700 mb-1">
                    Domain
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.domain}
                    onChange={(e) =>
                      handleFilterChange("domain", e.target.value)
                    }
                  >
                    <option value="">All Domains</option>
                    <option value="OOR">Osha Outreach</option>
                    <option value="OOC">Osha Online Center</option>
                    <option value="OES">Osha Education School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.category}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                  >
                    <option value="">All Categories</option>
                    <option value="Order Creation">Order Creation</option>
                    <option value="Abandoned Cart">Abandoned Cart</option>
                    <option value="Free SignUp">Free SignUp</option>
                    <option value="Free Study Guide">Free Study Guide</option>
                    <option value="Custom Lead">Custom Lead</option>
                    <option value="Contact Us">Contact Us</option>
                    <option value="Scholarship">Scholarship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                  >
                    <option value="">All Status</option>
                    {getStatusOptionsForCategory(
                      filters.category as string
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="bg-white shadow-md rounded-md overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50 shadow-sm">
                    <tr>
                      <th
                        className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSortChange("category")}
                      >
                        <div className="flex items-center">
                          Full Name
                          {sort.field === "category" && (
                            <span className="ml-1">
                              {sort.direction === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSortChange("category")}
                      >
                        <div className="flex items-center">
                          Category
                          {sort.field === "category" && (
                            <span className="ml-1">
                              {sort.direction === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSortChange("domain")}
                      >
                        <div className="flex items-center">
                          Domain
                          {sort.field === "domain" && (
                            <span className="ml-1">
                              {sort.direction === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSortChange("createdAt")}
                      >
                        <div className="flex items-center">
                          Date Created
                          {sort.field === "createdAt" && (
                            <span className="ml-1">
                              {sort.direction === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentLeads.length > 0 ? (
                      currentLeads.map((lead) => (
                        <tr
                          key={lead._id as string}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div
                              className={`py-1 px-2 inline-block rounded-lg font-medium text-gray`}
                            >
                              {(() => {
                                const populatedKey = [
                                  "contact_us",
                                  "free_signup",
                                  "order_creation",
                                  "custom_lead",
                                  "abandoned_cart",
                                  "scholarship",
                                ].find((key) => lead[key as keyof ILead]);

                                if (!populatedKey) return "Unknown";

                                const leadData =
                                  lead[populatedKey as keyof ILead];

                                // Handle name formatting based on the populated key
                                if (populatedKey === "contact_us") {
                                  return (leadData as any)?.name || "Unknown";
                                }

                                if (
                                  populatedKey === "order_creation" ||
                                  populatedKey === "abandoned_cart" ||
                                  populatedKey === "free_signup" ||
                                  populatedKey === "scholarship" ||
                                  populatedKey === "custom_lead"
                                ) {
                                  return (
                                    `${(leadData as any)?.firstName ?? ""} ${
                                      (leadData as any)?.lastName ?? ""
                                    }`.trim() || "No Data Available"
                                  );
                                }

                                return "Unknown";
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div
                              className={`py-1 px-2 inline-block rounded-lg font-medium text-white ${
                                categoryColors[lead?.category ?? " "] ||
                                "bg-gray-500"
                              }`}
                            >
                              {lead?.category}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getDomainLabel(lead.domain || "")}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {lead.createdAt
                                ? new Date(lead.createdAt).toLocaleString(
                                    "en-US",
                                    {
                                      timeZone: "America/New_York",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    }
                                  ) + " EST"
                                : "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              className={`text-sm px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                lead.status === "Converted"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : lead.status === "Follow Up"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : lead.status === "Pending"
                                  ? "bg-gray-100 text-gray-800 border-gray-200"
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                              }`}
                              value={
                                lead.status === "Follow Up" && hasFollowUp(lead)
                                  ? `Follow-up #${getFollowUpCount(lead) + 1}`
                                  : lead.status
                              }
                              onChange={(e) =>
                                handleStatusChange(
                                  lead._id as string,
                                  e.target.value
                                )
                              }
                              disabled={
                                lead.status === "Follow Up" &&
                                getFollowUpCount(lead) >= 3
                              }
                            >
                              {getStatusOptionsForCategory(
                                lead.category as string,
                                lead
                              ).map((status) => (
                                <option
                                  key={status}
                                  value={status}
                                  disabled={status === "Max Follow-ups Reached"}
                                >
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center"
                                onClick={() => handleViewLead(lead)}
                              >
                                <Eye size={14} className="mr-1" />
                                View
                              </button>

                              <button
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm flex items-center"
                                onClick={() => handleViewNotes(lead)}
                              >
                                Notes{" "}
                                {lead.notes &&
                                  Array.isArray(lead.notes) &&
                                  lead.notes.length > 0 && (
                                    <span className="ml-1 bg-white text-gray-700 text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                      {lead.notes.length}
                                    </span>
                                  )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-xl font-medium mb-2">
                              No leads found
                            </p>
                            <p className="text-sm text-gray-400">
                              Try changing your filters
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalLeadCount > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex gap-1">
                    {getPaginationButtons().map((pageNum) => (
                      <button
                        key={pageNum}
                        className={`w-10 h-10 ${
                          currentPage === pageNum
                            ? "bg-blue-100 text-blue-700 font-medium border-blue-300"
                            : "hover:bg-gray-100 text-gray-700"
                        } border border-gray-300 rounded-md transition-colors`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative group">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Items per page:
                    </span>
                    <select
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {[50, 100, 200, 500].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Lead Details
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Field
                    label="Domain"
                    value={getDomainLabel(selectedLead.domain || "")}
                  />
                  <Field label="Category" value={selectedLead.category} />
                  <Field label="Status" value={selectedLead.resolve_status} />
                  <Field
                    label="Date Created"
                    value={
                      selectedLead.createdAt
                        ? new Date(selectedLead.createdAt).toLocaleString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "N/A"
                    }
                  />
                </div>

                {/* Course Information */}
                {(selectedLead?.category === "Order Creation" ||
                  selectedLead?.category === "Abandoned Cart") && (
                  <CourseInfo selectedLead={selectedLead} />
                )}

                {/* Customer Information */}
                <Customer selectedLead={selectedLead} />
                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <select
                    className={`px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedLead.status === "Converted"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : selectedLead.status === "Follow Up"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : selectedLead.status === "Pending"
                        ? "bg-gray-100 text-gray-800 border-gray-200"
                        : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                    value={selectedLead.status}
                    onChange={(e) => {
                      handleStatusChange(
                        selectedLead._id as string,
                        e.target.value
                      );
                      setSelectedLead({
                        ...selectedLead,
                        status: e.target.value,
                      });
                    }}
                  >
                    {getStatusOptionsForCategory(
                      selectedLead.category as string
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Conversion Value Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Lead Converted
            </h2>
            <p className="text-gray-600 mb-4">
              Please enter the conversion value:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversion Value ($)
              </label>
              <input
                type="number"
                value={conversionValue || ""}
                onChange={(e) => setConversionValue(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add details about the conversion"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyStatusChange}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={!conversionValue}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow Up Modal with contact type checkboxes */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Schedule Follow Up
            </h2>
            <p className="text-gray-600 mb-4">
              Please set a date and contact methods for the follow up:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Method (select at least one)
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contact-email"
                    checked={contactTypes.includes("email")}
                    onChange={() => toggleContactType("email")}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="contact-email"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Email
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contact-call"
                    checked={contactTypes.includes("call")}
                    onChange={() => toggleContactType("call")}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="contact-call"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Phone Call
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contact-chat"
                    checked={contactTypes.includes("chat")}
                    onChange={() => toggleContactType("chat")}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="contact-chat"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Chat
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Notes
              </label>
              <textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add details about the follow up"
                rows={2}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Note (Optional)
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add additional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyStatusChange}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                disabled={!followUpDate || contactTypes.length === 0}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal for general status changes */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {pendingStatusChange === "Resolved"
                ? "Resolve Lead"
                : "Update Status"}
            </h2>
            <p className="text-gray-600 mb-4">
              {pendingStatusChange === "Resolved"
                ? "Add any final notes before resolving this lead:"
                : "Add a note about this status change (optional):"}
            </p>

            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add your notes here"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyStatusChange}
                className={`px-4 py-2 ${
                  pendingStatusChange === "Resolved"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"
                } text-white rounded-md`}
              >
                {pendingStatusChange === "Resolved"
                  ? "Resolve Lead"
                  : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Notes Modal */}
      {selectedLeadForNotes && (
        <LeadNotes
          lead={selectedLeadForNotes}
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
        />
      )}
    </div>
  );
};

export default MyLeads;
