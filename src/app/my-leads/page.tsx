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
  Plus,
} from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { Customer, Field } from "@/components/Customer";
import CourseInfo from "@/components/CourseInfo";
// import mongoose from "mongoose";
import LeadNotes from "../components/LeadNotes";
import { useSocket } from "@/hooks/useSocket";
import { isResolvedStatus } from "@/lib/leadUtils";
import { useLeadsData, SortConfig, FilterConfig } from "@/hooks/useLeadsData";

// Import reusable components
import LeadFilterPanel from "@/components/LeadFilterPanel";
import LeadsTable from "@/components/LeadsTable";
import LeadStatusModals from "@/components/LeadStatusModals";
import Pagination from "@/components/Pagination";

// Import utility functions
import {
  categoryColors,
  getDomainLabel,
  getFollowUpDisplayStatus,
  getStatusOptionsForCategory,
} from "@/components/LeadUtils";

// Domain mapping for labels
const DOMAIN_LABELS = {
  OOR: "Osha Outreach",
  OOC: "Osha Online Center",
  OES: "Osha Education School",
};

// Add type definition for contact type
type ContactType = "email" | "call" | "chat";

const MyLeads = () => {
  const {
    leads,
    setLeads,
    loading,
    fetchMyLeads,
    fetchMyLeadsUpdates,
    fetchLeadById,
    getSortedLeads,
    getFilteredLeads,
  } = useLeadsData();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { session, addNotification } = useApp();
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // Filtering and sorting state
  const [filters, setFilters] = useState<FilterConfig>({
    domain: "",
    category: "",
    status: "",
  });
  const [sort, setSort] = useState<SortConfig>({
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
        if (!isConnected && session && session._id) {
          // Only use polling if websocket is not connected AND session is valid
          fetchMyLeadsUpdates();
        }
      }, 30000); // Check for updates every 30 seconds as fallback

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

    // Handle special status types
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
      setContactTypes([]); // Reset contact types
      setFollowUpDate(""); // Reset follow-up date
      setFollowUpNote(""); // Reset follow-up note
      setShowFollowUpModal(true);
    } else {
      // For other statuses, prompt for a note (optional)
      setShowNoteModal(true);
    }
  };

  // Apply status change with additional data
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
    setCurrentLeadId(null);
    setPendingStatusChange(null);
    setConversionValue(undefined);
    setFollowUpDate("");
    setNewNote("");
    setContactTypes([]);
    setFollowUpNote("");
  };

  // Handle sort changes
  const handleSortChange = (field: "createdAt" | "category" | "domain") => {
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

  // Process leads with sorting and filtering
  const processedLeads = getFilteredLeads(getSortedLeads(leads, sort), filters);

  // Pagination calculation
  const totalLeadCount = processedLeads.length;
  const totalPages = Math.ceil(totalLeadCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalLeadCount);
  const currentLeads = processedLeads.slice(startIndex, endIndex);

  const handleDelete = async (
    leadId: string,
    isBatchOperation: boolean = false
  ) => {
    try {
      const res = await fetch(`/api/leads?leadId=${leadId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete lead");
      }

      // Update state
      setLeads((prevLeads) => prevLeads.filter((lead) => lead._id !== leadId));

      // Skip individual notifications for batch operations
      if (!isBatchOperation) {
        addNotification({
          message: "Lead deleted successfully",
          type: "info",
          read: false,
        });
      }

      return true;
    } catch (error) {
      console.error("Error deleting lead:", error);
      addNotification({
        message: "Failed to delete lead",
        type: "warning",
        read: false,
      });
      return false;
    }
  };

  // Add batch delete function
  const handleBatchDelete = async (leadIds: string[]) => {
    try {
      const res = await fetch("/api/leads?batch=true", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete leads");
      }

      const data = await res.json();

      // Update state to remove deleted leads
      setLeads((prevLeads) =>
        prevLeads.filter((lead) => !leadIds.includes(lead._id as string))
      );

      // Show success notification
      addNotification({
        message:
          data.message || `${data.deletedCount} leads deleted successfully`,
        type: "info",
        read: false,
      });

      return true;
    } catch (error) {
      console.error("Error batch deleting leads:", error);
      addNotification({
        message: "Failed to delete leads",
        type: "warning",
        read: false,
      });
      return false;
    }
  };

  // Add assign function for my-leads
  const handleAssign = async (
    leadId: string,
    userId?: string,
    isBatchOperation = false
  ) => {
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, userId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Update leads state
        setLeads((prevLeads) => {
          return prevLeads.map((lead) => {
            if (lead._id === leadId) {
              const updatedLead = { ...lead };
              updatedLead.assigned = true;
              updatedLead.assignedAt = new Date();
              if (data.assignedTo) {
                (updatedLead as any).assigned_to = data.assignedTo;
              } else if (session?._id) {
                (updatedLead as any).assigned_to = {
                  _id: session._id,
                  full_name: session.full_name || "User",
                  user_name: session.user_name || "User",
                };
              }
              return updatedLead;
            }
            return lead;
          });
        });

        if (!isBatchOperation) {
          addNotification({
            message: `Lead assigned successfully`,
            type: "info",
            read: false,
          });
        }

        return true;
      } else {
        if (!isBatchOperation) {
          addNotification({
            message: data.error || data.message || "Failed to assign lead",
            type: "warning",
            read: false,
          });
        }
        return false;
      }
    } catch (error) {
      console.error("Error assigning lead:", error);
      if (!isBatchOperation) {
        addNotification({
          message: "Failed to assign lead",
          type: "warning",
          read: false,
        });
      }
      return false;
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
              <LeadFilterPanel
                filters={filters}
                handleFilterChange={handleFilterChange}
                getStatusOptionsForCategory={getStatusOptionsForCategory}
              />
            )}

            {/* Leads Table */}
            <LeadsTable
              leads={currentLeads}
              onAssign={handleAssign}
              title="My Leads"
              isMyLeads={true}
              onDelete={handleDelete}
              onBatchDelete={handleBatchDelete}
              onRefresh={fetchMyLeads}
            />

            {/* Pagination */}
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

      {/* Status-related modals */}
      <LeadStatusModals
        showConversionModal={showConversionModal}
        showFollowUpModal={showFollowUpModal}
        showNoteModal={showNoteModal}
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
        closeAllModals={closeAllModals}
        applyStatusChange={applyStatusChange}
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
