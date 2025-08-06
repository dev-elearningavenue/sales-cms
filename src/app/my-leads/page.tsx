"use client";
import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";
import { Filter, X, Search, RefreshCcw } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { Customer, Field } from "@/components/Customer";
import CourseInfo from "@/components/CourseInfo";
import LeadNotes from "../components/LeadNotes";
import { useSocket } from "@/hooks/useSocket";
import { useLeadsData, SortConfig, FilterConfig } from "@/hooks/useLeadsData";

import LeadFilterPanel from "@/components/LeadFilterPanel";
import MyLeadTable from "@/components/MyLeadTable";
import LeadStatusModals from "@/components/LeadStatusModals";
import Pagination from "@/components/Pagination";

// Import utility functions
import {
  categoryColors,
  getDomainLabel,
  getFollowUpDisplayStatus,
  getStatusOptionsForCategory,
} from "@/components/LeadUtils";

// Add type definition for contact type
type ContactType = "email" | "call" | "chat";

// Helper to check if HTML content has actual text
const hasActualContent = (htmlString: string): boolean => {
  if (!htmlString) return false;
  // Create a temporary div to extract text content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString;
  const textContent = tempDiv.textContent || tempDiv.innerText || "";
  return textContent.trim().length > 0;
};

const getLeadEmail = (lead: ILead): string => {
  if (
    lead.contact_us &&
    typeof lead.contact_us === "object" &&
    (lead.contact_us as any).email
  ) {
    return (lead.contact_us as any).email;
  }

  if (
    lead.free_signup &&
    typeof lead.free_signup === "object" &&
    (lead.free_signup as any).email
  ) {
    return (lead.free_signup as any).email;
  }

  if (
    lead.custom_lead &&
    typeof lead.custom_lead === "object" &&
    (lead.custom_lead as any).email
  ) {
    return (lead.custom_lead as any).email;
  }

  if (
    lead.scholarship &&
    typeof lead.scholarship === "object" &&
    (lead.scholarship as any).email
  ) {
    return (lead.scholarship as any).email;
  }

  if (
    lead.abandoned_cart &&
    typeof lead.abandoned_cart === "object" &&
    (lead.abandoned_cart as any).email
  ) {
    return (lead.abandoned_cart as any).email;
  }

  return ""; // No email found
};

// Helper function to get domain email
const getDomainEmail = (domain: string): string => {
  console.log("domain: ", domain);
  const domainEmails = {
    OOR: process.env.NEXT_PUBLIC_EMAIL_OOR,
    OOC: process.env.NEXT_PUBLIC_EMAIL_OOC,
    OES: process.env.NEXT_PUBLIC_EMAIL_OES,
    FOC: process.env.NEXT_PUBLIC_EMAIL_FOC,
  };
  return domainEmails[domain as keyof typeof domainEmails] || "";
};

const MyLeads = () => {

  const {
    leads,
    setLeads,
    loading,
    fetchMyLeads,
    fetchMyLeadsUpdates,
    fetchLeadById,
    getSortedLeads,
    getFilteredLeads
  } = useLeadsData();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { session, addNotification, showToast } = useApp();

  // Filtering and sorting state
  const [filters, setFilters] = useState<FilterConfig>({
    domain: "",
    category: "",
    status: "",
  });
  const [sort, setSort] = useState<SortConfig>({
    field: "updatedAt",
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
  const [showLvmModal, setShowLvmModal] = useState(false);
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

  // LVM email modal state
  const [lvmEmailData, setLvmEmailData] = useState({
    from: "",
    to: "",
    cc: "",
    subject: "Follow-up: Your Recent Inquiry",
    body: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize WebSocket connection with event handlers
  const { isConnected } = useSocket({
    onLeadAssigned: (data) => {
      const assignedLead = data.lead;

      // Only care about assignments to the current user
      if (
        assignedLead &&
        assignedLead.assigned_to &&
        assignedLead.assigned_to._id === session?._id
      ) {
        // Fetch the complete lead data since socket only sends minimal data
        fetchLeadById(assignedLead._id);
      }
    },
    onLeadStatusChanged: (data) => {
      const updatedLead = data.lead;

      // Check if this is one of our leads
      if (leads.some((lead) => lead._id === updatedLead._id)) {
        // Fetch the complete lead data
        fetchLeadById(updatedLead._id);
      }
    },
    onLeadDeleted: (data) => {
      const deletedLeadId = data.leadId;
      // Remove the lead if it's in our list
      setLeads((prevLeads) =>
        prevLeads.filter((lead) => lead._id !== deletedLeadId)
      );
    },
  });

  useEffect(() => {
    if (session) {
      fetchMyLeads();

      // Set up polling for assigned lead updates - as a backup for websockets
      const intervalId = setInterval(() => {
        if (!isConnected) {
          // Only use polling if websocket is not connected
          fetchMyLeadsUpdates();
        }
      }, 5 * 60000);

      return () => clearInterval(intervalId);
    }
  }, [session, isConnected]);

  // Handle selecting/deselecting contact types
  const toggleContactType = (type: ContactType) => {
    if (contactTypes.includes(type)) {
      setContactTypes(contactTypes.filter((t) => t !== type));
    } else {
      setContactTypes([...contactTypes, type]);
    }
  };

  // Modify the handleStatusChange function to handle follow-up levels
  const handleStatusChange = (leadId: string, newStatus: string) => {
    // Find the lead
    const lead = leads.find((l) => l._id === leadId);
    if (!lead) return;

    let actualStatus = newStatus;

    // Convert legacy "Follow-up #X" format to new format
    if (newStatus.startsWith("Follow-up #")) {
      const level = parseInt(newStatus.replace("Follow-up #", ""));
      actualStatus = `Follow Up ${level}`;
    }

    // Store the lead ID and pending status
    setCurrentLeadId(leadId);
    setPendingStatusChange(actualStatus);

    // Show appropriate modal based on status
    if (actualStatus === "Converted") {
      setShowConversionModal(true);
    } else if (actualStatus.startsWith("Follow Up")) {
      // Always show follow-up modal for any follow-up level
      setContactTypes(["email"]);
      setFollowUpDate("");
      setFollowUpNote("");

      // Also populate email data in case user selects email as contact method
      const leadEmail = getLeadEmail(lead);
      const domainEmail = getDomainEmail(lead.domain);
      setLvmEmailData({
        from: domainEmail,
        to: leadEmail,
        cc: "",
        subject: "Follow-up: Your Recent Inquiry",
        body: "",
      });

      setShowFollowUpModal(true);
    } else if (actualStatus === "LVM") {
      // Get lead email and domain email for the form
      const leadEmail = getLeadEmail(lead);
      const domainEmail = getDomainEmail(lead.domain);
      setLvmEmailData({
        from: domainEmail,
        to: leadEmail,
        cc: "",
        subject: "Follow-up: Your Recent Inquiry",
        body: "",
      });
      setShowLvmModal(true);
    } else {
      setShowNoteModal(true);
    }
  };

  // Apply status change with additional data
  // Handle LVM email sending
  const sendLvmEmail = async () => {
    if (
      !currentLeadId ||
      !lvmEmailData.to ||
      !lvmEmailData.subject ||
      !hasActualContent(lvmEmailData.body)
    ) {
      addNotification({
        message: "Please fill in all required email fields",
        type: "warning",
        read: false,
      });
      return;
    }

    // Get the lead to access its domain
    const lead = leads.find((l) => l._id === currentLeadId);
    if (!lead) {
      addNotification({
        message: "Lead not found",
        type: "warning",
        read: false,
      });
      return;
    }

    try {
      // Send email via API with domain
      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: lvmEmailData.to,
          cc: lvmEmailData.cc,
          subject: lvmEmailData.subject,
          body: lvmEmailData.body,
          leadId: currentLeadId,
          domain: lead.domain,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error("Failed to send email");
      }

      // Update lead status to LVM
      setPendingStatusChange("LVM");
      await applyStatusChange();

      addNotification({
        message: "Email sent successfully.",
        type: "info",
        read: false,
      });

      closeAllModals();
    } catch (error) {
      console.error("Error sending LVM email:", error);
      addNotification({
        message: "Failed to send email. Please try again.",
        type: "warning",
        read: false,
      });
    }
  };

  // Handle Follow-Up with optional email sending
  const applyFollowUpWithEmail = async () => {
    if (!currentLeadId || !pendingStatusChange) return;

    // Get the lead to access its domain
    const lead = leads.find((l) => l._id === currentLeadId);
    if (!lead) {
      addNotification({
        message: "Lead not found",
        type: "warning",
        read: false,
      });
      return;
    }

    try {
      // If email is selected as contact method, send email first
      if (contactTypes.includes("email")) {
        if (
          !lvmEmailData.to ||
          !lvmEmailData.subject ||
          !hasActualContent(lvmEmailData.body)
        ) {
          addNotification({
            message: "Please fill in all required email fields",
            type: "warning",
            read: false,
          });
          return;
        }

        // Send email via API with domain
        const emailResponse = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: lvmEmailData.to,
            cc: lvmEmailData.cc,
            subject: lvmEmailData.subject,
            body: lvmEmailData.body,
            leadId: currentLeadId,
            domain: lead.domain,
          }),
        });

        if (!emailResponse.ok) {
          throw new Error("Failed to send email");
        }

        addNotification({
          message: "Email sent successfully.",
          type: "info",
          read: false,
        });
      }

      // Then apply the follow-up status change
      await applyStatusChange();
    } catch (error) {
      console.error("Error in follow-up with email:", error);
      addNotification({
        message: "Failed to process follow-up. Please try again.",
        type: "warning",
        read: false,
      });
    }
  };

  const applyStatusChange = async () => {
    if (!currentLeadId || !pendingStatusChange) return;

    try {
      // Validate inputs for specific status types
      if (pendingStatusChange.startsWith("Follow Up")) {
        // Require date and contact type for follow-ups
        if (!followUpDate || contactTypes.length === 0) {
          addNotification({
            message: "Please set a date and select at least one contact method",
            type: "warning",
            read: false,
          });
          return;
        }
      }

      if (pendingStatusChange === "Converted" && !conversionValue) {
        addNotification({
          message: "Please enter a conversion value",
          type: "warning",
          read: false,
        });
        return;
      }

      // Prepare data based on status
      const requestData: any = {
        leadId: currentLeadId,
        newStatus: pendingStatusChange,
      };

      // Add additional data based on selected status
      if (pendingStatusChange === "Converted" && conversionValue) {
        requestData.conversionValue = conversionValue;
      }

      if (pendingStatusChange.startsWith("Follow Up") && followUpDate) {
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

            if (pendingStatusChange.startsWith("Follow Up") && followUpDate) {
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

      // Notify the user of the status change with a clear message
      addNotification({
        message: `Lead status updated to ${pendingStatusChange}`,
        type: "info",
        read: false,
      });

      // Reset form state
      closeAllModals();
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert the optimistic update
      fetchMyLeads();

      // Notify user of error
      addNotification({
        message: "Failed to update lead status",
        type: "warning",
        read: false,
      });
    }
  };

  // Helper to close all modals and reset form state
  const closeAllModals = () => {
    setShowConversionModal(false);
    setShowFollowUpModal(false);
    setShowNoteModal(false);
    setShowLvmModal(false);
    setShowNotesModal(false);
    setIsModalOpen(false);
    setCurrentLeadId(null);
    setPendingStatusChange(null);
    setConversionValue(undefined);
    setFollowUpDate("");
    setNewNote("");
    setContactTypes([]);
    setFollowUpNote("");
    setLvmEmailData({
      from: "",
      to: "",
      cc: "",
      subject: "Follow-up: Your Recent Inquiry",
      body: "",
    });
  };

  // Handle sort changes
  const handleSortChange = (field: "createdAt" | "updatedAt" | "assignedAt" | "category" | "domain") => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
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

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await fetchMyLeads(true);
      showToast("My leads checked for updates", "info");
    } catch (error) {
      console.error("Error refreshing leads:", error);
      showToast("Failed to check for updates", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to search in name, category, domain, and status
  const matchesSearch = (lead: ILead, query: string) => {
    const lowerQuery = query.toLowerCase();
    const name = (() => {
      const populatedKey = [
        "contact_us",
        "free_signup",
        "order_creation",
        "custom_lead",
        "abandoned_cart",
        "scholarship",
      ].find((key) => lead[key as keyof ILead]);
      if (!populatedKey) return "";
      const leadData = lead[populatedKey as keyof ILead];
      if (populatedKey === "contact_us") {
        return ((leadData as any)?.name || "").toLowerCase();
      }
      if (
        populatedKey === "order_creation" ||
        populatedKey === "abandoned_cart" ||
        populatedKey === "free_signup" ||
        populatedKey === "scholarship" ||
        populatedKey === "custom_lead"
      ) {
        const fullName = `${(leadData as any)?.firstName || ""} ${
          (leadData as any)?.lastName || ""
        }`
          .trim()
          .toLowerCase();
        return fullName;
      }
      return "";
    })();
    const category = (lead.category || "").toLowerCase();
    const domain = (lead.domain || "").toLowerCase();
    const status = (lead.status || "").toLowerCase();
    return (
      name.includes(lowerQuery) ||
      category.includes(lowerQuery) ||
      domain.includes(lowerQuery) ||
      status.includes(lowerQuery)
    );
  };

  // Filtered and paginated leads
  const processedLeads = getFilteredLeads(getSortedLeads(leads, sort), filters);
  const searchedLeads = searchQuery
    ? processedLeads.filter((lead) => matchesSearch(lead, searchQuery))
    : processedLeads;

  // Pagination calculation
  const totalLeadCount = searchedLeads.length;
  const totalPages = Math.ceil(totalLeadCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalLeadCount);
  const currentLeads = searchedLeads.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {loading ? (
        <LoadingSkeleton component="my leads" />
      ) : (
        <div className="bg-white w-full rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 w-full">
                        <div className="flex flex-wrap gap-8 items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mr-2">
                My Leads
              </h1>
              {/* Search Input */}
              <div className="flex-grow mx-2 min-w-[250px] max-w-[450px]">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search Lead (name, category, domain, status)"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="text-sm text-gray-600 whitespace-nowrap mx-2 hidden sm:block">
                Showing{" "}
                <span className="font-medium">
                  {startIndex + 1}-{endIndex}
                </span>{" "}
                of <span className="font-medium">{totalLeadCount}</span> leads
              </div>
              {/* Top Pagination */}
              <div className="hidden md:block">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
                  getPaginationButtons={getPaginationButtons}
                  showItemsPerPage={false}
                  compact={true}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 ${
                    isRefreshing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh my leads"
                >
                  <RefreshCcw
                    className={`h-5 w-5 text-gray-600 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {showFiltersPanel ? "Hide Filters" : "Show Filters"}
                  </span>
                </button>
              </div>
            </div>

            {/* Filters and Pagination Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
              <LeadFilterPanel
                filters={filters}
                handleFilterChange={handleFilterChange}
                getStatusOptionsForCategory={getStatusOptionsForCategory}
              />
            )}

            {/* Leads Table */}
            <MyLeadTable
              currentLeads={currentLeads}
              handleViewLead={handleViewLead}
              handleViewNotes={handleViewNotes}
              handleStatusChange={handleStatusChange}
              getFollowUpDisplayStatus={getFollowUpDisplayStatus}
              getStatusOptionsForCategory={getStatusOptionsForCategory}
              handleSortChange={(field: string) =>
                handleSortChange(field as "createdAt" | "category" | "domain")
              }
              sort={sort}
              categoryColors={categoryColors}
              getDomainLabel={getDomainLabel}
            />

            {/* Bottom Pagination */}
            {totalLeadCount > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                getPaginationButtons={getPaginationButtons}
              />
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
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
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
                  selectedLead?.category === "Abandoned Cart" ||
                  selectedLead?.category === "Unpaid Training") && (
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
                        : (selectedLead.status || "").startsWith("Follow Up")
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : selectedLead.status === "Pending"
                        ? "bg-gray-100 text-gray-800 border-gray-200"
                        : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                    value={getFollowUpDisplayStatus(selectedLead)}
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
                    <option value={getFollowUpDisplayStatus(selectedLead)}>
                      {getFollowUpDisplayStatus(selectedLead)}
                    </option>
                    {getStatusOptionsForCategory(
                      selectedLead.category as string,
                      selectedLead
                    )
                      .filter((opt) => opt !== getFollowUpDisplayStatus(selectedLead))
                      .map((status) => (
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

      {/* Status-related modals */}
      <LeadStatusModals
        selectedLead={selectedLead}
        showConversionModal={showConversionModal}
        showFollowUpModal={showFollowUpModal}
        showNoteModal={showNoteModal}
        showLvmModal={showLvmModal}
        pendingStatusChange={pendingStatusChange}
        conversionValue={conversionValue}
        setConversionValue={setConversionValue}
        newNote={newNote}
        setNewNote={setNewNote}
        followUpDate={followUpDate}
        setFollowUpDate={setFollowUpDate}
        contactTypes={contactTypes}
        toggleContactType={toggleContactType}
        followUpNote={followUpNote}
        setFollowUpNote={setFollowUpNote}
        lvmEmailData={lvmEmailData}
        setLvmEmailData={setLvmEmailData}
        closeAllModals={closeAllModals}
        applyStatusChange={applyStatusChange}
        sendLvmEmail={sendLvmEmail}
        applyFollowUpWithEmail={applyFollowUpWithEmail}
      />

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
