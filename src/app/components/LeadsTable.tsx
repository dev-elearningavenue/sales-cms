// components/LeadsTable.tsx
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Search,
  RefreshCcw,
  Calendar,
  UserPlus,
  Plus,
  Trash2,
  ChevronDown,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";
import { isResolvedStatus } from "@/lib/leadUtils";
import { getDomainLabel, categoryColors } from "@/components/LeadUtils";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import ConfirmationModal from "@/app/components/ConfirmationModal";

// User type for the dropdown
interface User {
  _id: string;
  full_name: string;
  user_name: string;
  user_type: number;
}

// Server-side pagination interface
interface ServerPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  assignedToFilter?: string;
  searchQuery?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onAssignedToChange?: (assignedTo: string) => void;
  onSearchChange?: (search: string) => void;
  onFiltersChange?: (filters: {
    type: string;
    domain: string;
    status: string;
    startDate: string;
    endDate: string;
  }) => void;
}

interface LeadsTableProps {
  leads: ILead[];
  onAssign?: (
    leadId: string,
    userId?: string,
    isBatchOperation?: boolean
  ) => Promise<boolean>;
  title: string;
  isMyLeads?: boolean;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  onDelete?: (leadId: string, isBatchOperation: boolean) => Promise<boolean>;
  onBatchDelete?: (leadIds: string[]) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
  onViewDetails?: (lead: ILead) => void;
  serverPagination?: ServerPaginationProps;
  isLoading?: boolean;
}

const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onAssign,
  title,
  isMyLeads = false,
  showCreateButton = false,
  onCreateClick,
  onDelete,
  onBatchDelete,
  onRefresh,
  onViewDetails,
  serverPagination,
  isLoading = false,
}) => {
  const { session, addNotification } = useApp();

  // Use server pagination if provided, otherwise use local state
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(50);

  // Determine which pagination to use
  const isServerPaginated = !!serverPagination;
  const currentPage = isServerPaginated ? serverPagination.currentPage : localCurrentPage;
  const itemsPerPage = isServerPaginated ? serverPagination.pageSize : localItemsPerPage;

  const setCurrentPage = (page: number) => {
    if (isServerPaginated) {
      serverPagination.onPageChange(page);
    } else {
      setLocalCurrentPage(page);
    }
  };

  const setItemsPerPage = (size: number) => {
    if (isServerPaginated) {
      serverPagination.onPageSizeChange(size);
    } else {
      setLocalItemsPerPage(size);
      setLocalCurrentPage(1); // Reset to page 1
    }
  };
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentStatus: ["Unpaid"],
    startDate: "",
    endDate: "",
    category: [] as string[],
    type: "",
    domain: "",
    status: "",
    assignedTo: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isDbSearchActive, setIsDbSearchActive] = useState(false); // Track if showing DB search results
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Add state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // Add state for lead details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] =
    useState<ILead | null>(null);

  // Add state to track shown notifications
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(
    new Set()
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error refreshing leads:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch available users for assignment - ONLY ONCE when session is available
  const [usersFetched, setUsersFetched] = useState(false);

  useEffect(() => {
    if (
      session &&
      (session.user_type === 1 || session.user_type === 2) &&
      !usersFetched &&
      !loadingUsers
    ) {
      fetchAvailableUsers();
      setUsersFetched(true);
    }
  }, [session, usersFetched, loadingUsers]);

  // Refresh users only when batch modal opens (if needed)
  useEffect(() => {
    if (showBatchAssignModal && availableUsers.length === 0 && !loadingUsers) {
      fetchAvailableUsers();
    }
  }, [showBatchAssignModal]);

  // Function to fetch users with lower type than current user
  const fetchAvailableUsers = async () => {
    if (!session) return;

    setLoadingUsers(true);
    try {
      // console.log("Fetching available users for user type:", session.user_type);
      // Fetch users with lower user_type than current user
      const response = await fetch("/api/users");
      const data = await response.json();

      if (response.ok && data.success && data.users) {
        // Filter users with lower user_type than current user
        const filteredUsers = data.users.filter(
          (user: User) =>
            user.user_type > session.user_type && user.user_type <= 3
        );

        // console.log("Filtered users:", filteredUsers);
        setAvailableUsers(filteredUsers);
      } else {
        console.error(
          "Failed to fetch users:",
          data.message || "Unknown error"
        );
      }
    } catch (error) {
      console.error("Error fetching users for assignment:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Toggle dropdown visibility
  const toggleDropdown = (leadId: string | null) => {
    setOpenDropdownId(openDropdownId === leadId ? null : leadId);
  };

  // Handle assigning to specific user
  const confirmAssign = async (leadId: string, userId: string) => {
    if (onAssign) {
      try {
        const success = await onAssign(leadId, userId);
        if (success) {
          setOpenDropdownId(null);
        } else {
          // Handle failure - the onAssign function will show appropriate alerts
        }
      } catch (error) {
        console.error("Error during assignment:", error);
        alert("Failed to assign lead. Please try again.");
      }
    }
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest(".dropdown")) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId]);

  // Clear selected leads if they no longer exist in the leads array
  useEffect(() => {
    if (selectedLeads.length > 0) {
      const existingLeadIds = new Set(leads.map((lead) => lead._id));
      const validSelectedLeads = selectedLeads.filter((leadId) =>
        existingLeadIds.has(leadId)
      );

      if (validSelectedLeads.length !== selectedLeads.length) {
        setSelectedLeads(validSelectedLeads);
      }
    }
  }, [leads, selectedLeads]);

  // Filter leads based on search query and other filters
  const filteredLeads = leads.filter((lead) => {

    // Search filter - only run on frontend if NOT showing DB search results
    // When isDbSearchActive, server already filtered the results
    if (searchQuery && !isDbSearchActive) {

      const nameMatch = lead.fullname
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const emailMatch = lead.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const contactMatch = lead.contactNo
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const categoryMatch = lead.category
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const domainMatch = lead.domain
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Search in status
      const statusMatch = lead.status
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Search in assigned user name
      const assignedUserMatch = (() => {
        if (!lead.assigned_to || typeof lead.assigned_to !== 'object') return false;
        const assignedUser = lead.assigned_to as any;
        const userName = (assignedUser.full_name || assignedUser.user_name || '').toLowerCase();
        return userName.includes(searchQuery.toLowerCase());
      })();

      if (!(nameMatch || emailMatch || contactMatch || categoryMatch || domainMatch || statusMatch || assignedUserMatch)) {
        return false;
      }
    }

    // Apply other filters (client-side only when NOT server-paginated)
    // For server pagination, these filters must come from backend query params
    if (!isServerPaginated) {
      if (filters.type && lead.category !== filters.type) return false;
      if (filters.domain && lead.domain !== filters.domain) return false;
      if (filters.status && lead.status !== filters.status) return false;
    }

    // Assignment filter (only for client-side pagination, server handles it otherwise)
    if (!isServerPaginated && filters.assignedTo) {
      if (filters.assignedTo === "unassigned") {
        if (lead.assigned_to) return false;
      } else if (filters.assignedTo === "assigned") {
        if (!lead.assigned_to) return false;
      } else {
        if (!lead.assigned_to || typeof lead.assigned_to !== 'object') return false;
        const assignedUserId = (lead.assigned_to as any)._id || (lead.assigned_to as any).id;
        if (assignedUserId !== filters.assignedTo) return false;
      }
    }

    return true;
  });

  // Pagination calculation - different logic for server vs client pagination
  const totalPages = isServerPaginated
    ? serverPagination.totalPages
    : Math.ceil(filteredLeads.length / itemsPerPage);

  const totalCount = isServerPaginated
    ? serverPagination.totalCount
    : filteredLeads.length;

  // For server pagination, leads are already paginated - no slicing needed
  // For client pagination, slice the filtered leads
  const startIndex = isServerPaginated ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = isServerPaginated
    ? filteredLeads.length
    : Math.min(startIndex + itemsPerPage, filteredLeads.length);
  const currentLeads = isServerPaginated
    ? filteredLeads
    : filteredLeads.slice(startIndex, endIndex);

  // Calculate display values for "Showing X-Y of Z"
  const displayStart = isServerPaginated
    ? (currentPage - 1) * itemsPerPage + 1
    : startIndex + 1;
  const displayEnd = isServerPaginated
    ? Math.min(currentPage * itemsPerPage, totalCount)
    : endIndex;

  const handleFilterChange = (category: string, value: string) => {
    const newFilters = { ...filters };

    if (category === "category") {
      if (newFilters.category.includes(value)) {
        newFilters.category = newFilters.category.filter((cat) => cat !== value);
      } else {
        newFilters.category = [...newFilters.category, value];
      }
    } else if (category === "type") {
      newFilters.type = value;
    } else if (category === "domain") {
      // Convert domain label back to domain code
      const domainCode =
        value === "Osha Outreach" ? "OOR"
          : value === "Osha Online Center" ? "OOC"
            : value === "Osha Education School" ? "OES"
              : value === "Free Osha Courses" ? "FOC"
                : value === "Osha 30 Construction" ? "30Construction"
                  : value === "EHS Practice" ? "EHSP"
                    : value === "EHS School" ? "EHSS"
                      : value === "Osha Practice" ? "OP"
                        : value === "NY Osha 30" ? "NY30"
                          : value === "Osha 360" ? "Osha360"
                            : "";
      newFilters.domain = domainCode;
    } else {
      (newFilters as any)[category] = value;
    }

    setFilters(newFilters);

    // If using server pagination, push filters to backend (so each page stays full)
    if (isServerPaginated && serverPagination?.onFiltersChange) {
      serverPagination.onPageChange(1);
      serverPagination.onFiltersChange({
        type: newFilters.type,
        domain: newFilters.domain,
        status: newFilters.status,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
      });
    } else if (!isServerPaginated) {
      setLocalCurrentPage(1);
    }
  };

  // Handle select all leads
  const handleSelectAll = () => {
    if (selectedLeads.length === currentLeads.length) {
      // If all are selected, unselect all
      setSelectedLeads([]);
    } else {
      const allLeadIds = currentLeads
        .filter((lead) => lead._id)
        .map((lead) => lead._id as string);
      setSelectedLeads(allLeadIds);
    }
  };

  // Handle individual lead selection
  const handleSelectLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter((id) => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  // Handle batch assign
  const handleBatchAssign = () => {
    if (selectedLeads.length > 0) {
      setShowBatchAssignModal(true);
    }
  };

  // Confirm batch assign
  const confirmBatchAssign = async (userId?: string) => {
    if (!onAssign || selectedLeads.length === 0) return;
    const assignCount = selectedLeads.length;
    let successCount = 0;
    let failCount = 0;

    setIsProcessing(true);

    try {
      // Instead of Promise.all, process sequentially to handle errors for each lead
      for (const leadId of selectedLeads) {
        try {
          const success = await onAssign(leadId, userId, true);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error assigning lead ${leadId}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        addNotification({
          message: `${successCount} leads assigned successfully`,
          type: "info",
          read: false,
        });
      }

      if (failCount > 0) {
        addNotification({
          message: `Failed to assign ${failCount} leads (possibly already assigned)`,
          type: "warning",
          read: false,
        });
      }
    } catch (error) {
      console.error("Batch assign operation failed:", error);
      alert("An error occurred during the batch assignment.");
    } finally {
      setIsProcessing(false);
      setShowBatchAssignModal(false);
      setSelectedLeads([]);
    }
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    if (selectedLeads.length > 0) {
      setShowBatchDeleteModal(true);
    }
  };

  // Confirm batch delete
  const confirmBatchDelete = async () => {
    if ((!onDelete && !onBatchDelete) || selectedLeads.length === 0) return;

    const deletedCount = selectedLeads.length;
    setIsProcessing(true);

    try {
      // Use batch delete if available, otherwise fallback to individual deletes
      if (onBatchDelete) {
        const success = await onBatchDelete(selectedLeads);

        if (success && window && window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent("batchDelete", {
              detail: { count: deletedCount },
            })
          );
        }
      } else if (onDelete) {
        // Fallback to individual deletes
        const deletePromises = selectedLeads.map((leadId) =>
          onDelete(leadId, true)
        );
        const results = await Promise.all(deletePromises);

        // Count successful deletions
        const successfulDeletes = results.filter(Boolean).length;

        if (window && window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent("batchDelete", {
              detail: { count: successfulDeletes },
            })
          );
        }
      }
    } catch (error) {
      console.error("Batch delete operation failed:", error);
    } finally {
      setIsProcessing(false);
    }
    setShowBatchDeleteModal(false);
    setSelectedLeads([]);
  };

  const handleDeleteClick = (leadId: string) => {
    setLeadToDelete(leadId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (leadToDelete && onDelete) {
      const success = await onDelete(leadToDelete, false);
      // onDelete(leadToDelete, false);
      if (success && selectedLeads.includes(leadToDelete)) {
        setSelectedLeads((prev) => prev.filter((id) => id !== leadToDelete));
      }
      setShowDeleteModal(false);
      setLeadToDelete(null);
    }
  };

  // Check if any selected lead is already assigned
  const isAnySelectedLeadAssigned = () => {
    if (selectedLeads.length === 0) return false;

    return selectedLeads.some((leadId) => {
      const lead = leads.find((l) => l._id === leadId);
      return lead?.assigned === true; // True if it is assigned
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>

          {/* Batch actions */}
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""}{" "}
                selected
              </span>
              {onAssign && !isAnySelectedLeadAssigned() && (
                <button
                  onClick={handleBatchAssign}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign All</span>
                  {session?.user_type !== 3 && (
                    <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </button>
              )}
              {onDelete && session?.user_type !== 3 && (
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col text-xs md:flex-row md:items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                className={`flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh leads"
              >
                <RefreshCcw
                  className={`h-5 w-5 text-gray-600 ${isRefreshing ? "animate-spin" : ""
                    }`}
                />
              </button>

              {/* Date Range Fields */}
              <div className="relative">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <div className="relative">
                <input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium">
                Send Follow-up
              </button>

              <button className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 font-medium">
                Remove Stale Leads
              </button>
            </div>
          </div>

          {showCreateButton && !selectedLeads.length && (
            <button
              onClick={onCreateClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Lead
            </button>
          )}
        </div>

        {/* Search, Filters and Pagination Row*/}
        <div className="filter-section flex flex-col text-xs md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div className="flex gap-3 flex-grow">
            <form
              className="relative flex-grow"
              onSubmit={(e) => {
                e.preventDefault();
                // Search in DB on form submit
                if (isServerPaginated && serverPagination.onSearchChange && searchQuery.trim()) {
                  serverPagination.onSearchChange(searchQuery.trim());
                  setIsDbSearchActive(true);
                }
              }}
            >
              <input
                type="text"
                placeholder="Search by name, email, status, domain, or assigned user"
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchQuery(newValue);

                  // If DB search was active and user starts typing/clearing
                  if (isDbSearchActive) {
                    // Reset to original data (clear server search)
                    if (isServerPaginated && serverPagination.onSearchChange) {
                      serverPagination.onSearchChange("");
                    }
                    setIsDbSearchActive(false);
                  }

                  // Reset to page 1 locally for frontend filtering
                  setLocalCurrentPage(1);
                }}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              {/* DB Search Button - searches entire database */}
              {isServerPaginated && serverPagination.onSearchChange && (
                <button
                  type="submit"
                  className={`absolute right-2 top-1.5 p-1 ${isDbSearchActive ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded transition-colors`}
                  title={isDbSearchActive ? "DB search active - type to reset" : "Search in entire database (or press Enter)"}
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Assignment Dropdown */}
            {session && (session.user_type === 1 || session.user_type === 2) && (
              <div className="relative">
                <select
                  value={isServerPaginated ? (serverPagination.assignedToFilter || "") : filters.assignedTo}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isServerPaginated && serverPagination.onAssignedToChange) {
                      // Server-side filtering - call API with filter
                      serverPagination.onAssignedToChange(value);
                    } else {
                      // Client-side filtering
                      handleFilterChange("assignedTo", value);
                      setCurrentPage(1);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[150px]"
                >
                  <option value="">All Leads</option>
                  <option value="Unassigned">Unassigned</option>
                  <option value="assigned">Assigned</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.full_name || user.user_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>

          {/* Pagination Summary */}
          <div className="text-xs text-gray-600">
            Showing {displayStart}-{displayEnd} of {totalCount} leads
          </div>

          <div className="flex text-xs items-center gap-2">
            <button
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              <ChevronsLeft className="h-5 w-5" />
            </button>
            <button
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* <span className="text-sm px-4 py-2">
              {currentPage} / {totalPages || 1}
            </span> */}

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    className={`w-10 h-10 ${currentPage === pageNum
                      ? "bg-gray-200 font-medium"
                      : "hover:bg-gray-100"
                      } border border-gray-300 rounded-md`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <span className="flex items-center px-2">...</span>
              )}
            </div>

            <button
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(totalPages)}
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
            <div className="relative group">
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                {itemsPerPage} / page
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden z-20 hidden group-hover:block">
                {[50, 100, 200, 500].map((value) => (
                  <button
                    key={value}
                    className={`w-full px-4 py-2 text-left ${itemsPerPage === value
                      ? "bg-blue-50 font-medium"
                      : "hover:bg-gray-50"
                      }`}
                    onClick={() => setItemsPerPage(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filter-options-wrapper border border-gray-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-black text-base font-medium">Filters</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowFilters(false)}
              >
                ✕
              </button>
            </div>

            <div className="grid text-sm md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3">Domain</h4>
                <div className="space-y-2">
                  {[
                    "Osha Outreach",
                    "Osha Online Center",
                    "Osha Education School",
                    "Free Osha Courses",
                    "Osha 30 Construction",
                    "EHS Practice",
                    "Osha Practice",
                    "EHS School",
                    "NY Osha 30",
                    "Osha 360",
                  ].map((domain) => (
                    <label key={domain} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={
                          filters.domain ===
                          (domain === "Osha Outreach" ? "OOR"
                            : domain === "Osha Online Center" ? "OOC"
                              : domain === "Osha Education School" ? "OES"
                                : domain === "Free Osha Courses" ? "FOC"
                                  : domain === "Osha 30 Construction" ? "30Construction"
                                    : domain === "EHS Practice" ? "EHSP"
                                      : domain === "Osha Practice" ? "OP"
                                        : domain === "EHS School" ? "EHSS"
                                          : domain === "NY Osha 30" ? "NY30"
                                            : domain === "Osha 360" ? "Osha360"
                                              : "")
                        }
                        onChange={() => handleFilterChange("domain", domain)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{domain}</span>
                    </label>
                  ))}
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={filters.domain === ""}
                      onChange={() => handleFilterChange("domain", "")}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>All Domains</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Lead Type</h4>
                <div className="space-y-2">
                  {[
                    "Abandoned Cart",
                    "Order Creation",
                    "Contact Us",
                    "Free SignUp",
                    "Free Study Guide",
                    "Custom Lead",
                    "Scholarship",
                    "Invoice",
                  ].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={filters.type === type}
                        onChange={() => handleFilterChange("type", type)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={filters.type === ""}
                      onChange={() => handleFilterChange("type", "")}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>All Types</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Status</h4>
                <div className="space-y-2">
                  {[
                    "Pending",
                    "LVM",
                    "Follow Up",
                    "Follow Up 1",
                    "Follow Up 2",
                    "Follow Up 3",
                    "Closed"
                  ].map((status) => (
                    <label key={status} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={filters.status === status}
                        onChange={() => handleFilterChange("status", status)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={filters.status === ""}
                      onChange={() => handleFilterChange("status", "")}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>All Statuses</span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="overflow-x-auto relative">
          {/* Loading overlay when fetching new page */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          )}
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-2 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={
                      currentLeads.length > 0 &&
                      selectedLeads.length === currentLeads.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 relative group">
                  <span>TYPE</span>
                  <button className="ml-1">
                    <Filter className="h-4 w-4 text-gray-500" />
                  </button>
                  <div className="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-30 hidden group-hover:block">
                    {/* Reset option */}
                    <button
                      onClick={() => handleFilterChange("type", "")}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      Reset
                    </button>
                    {[
                      "Abandoned Cart",
                      "Order Creation",
                      "Contact Us",
                      "Free SignUp",
                      "Free Study Guide",
                      "Custom Lead",
                      "Scholarship",
                    ].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleFilterChange("type", option)}
                        className="w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  FULL NAME
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  DOMAIN
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  DATE CREATED
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  ACTION
                </th>
              </tr>
            </thead>

            <tbody className="leads-table-body divide-y divide-gray-200">
              {currentLeads.map((lead, index) => (
                <tr key={lead._id || index} className="hover:bg-gray-50 cursor-pointer" >
                  {/* CheckBox */}
                  <td className="w-12 px-2 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={
                        lead._id
                          ? selectedLeads.includes(lead._id as string)
                          : false
                      }
                      onChange={() =>
                        lead._id && handleSelectLead(lead._id as string)
                      }
                    />
                  </td>
                  {/* TYPE */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <p
                        className={`py-1 px-2 inline-block rounded-lg font-medium text-white ${categoryColors[lead?.category ?? " "] || "bg-gray-500"
                          }`}
                      >
                        {lead?.category}
                      </p>
                      {/* Show status for users other than usertype 3, but not for Invoice leads */}
                      {session?.user_type !== 3 && lead?.category !== "Invoice" && (
                        <div className="text-xs text-gray-500 font-medium">
                          Status: {lead.status || "Pending"}
                        </div>
                      )}
                    </div>
                  </td>
                  {/* Full Name */}
                  <td className="px-4 py-4">
                    <div className="py-4 text-lg font-medium text-gray-600 underline cursor-pointer" onClick={() => {
                      window.location.href = `/leads/${lead._id}/history`;
                    }}>
                      {((lead.contact_us as any) || lead.shortcourse_discount)
                        ?.name ||
                        [
                          lead.free_signup,
                          lead.order_creation,
                          lead.scholarship,
                          lead.custom_lead,
                          lead.abandoned_cart,
                          lead.invoice,
                        ]
                          .map((entry) =>
                            entry &&
                              typeof entry === "object" &&
                              "firstName" in entry &&
                              "lastName" in entry
                              ? `${entry.firstName} ${entry.lastName ?? ""}`
                              : null
                          )
                          .filter(Boolean)[0] ||
                        "No Data Available"}
                    </div>
                  </td>
                  {/* DOMAIN (LEAD SOURCE) */}
                  <td className="px-4 py-4 text-sm">
                    <div className="py-4 text-sm font-medium text-gray-600 whitespace-nowrap">
                      {getDomainLabel(lead.domain || "")}
                    </div>
                  </td>
                  {/* DATE CREATED */}
                  <td className="px-4 py-4 text-sm">
                    <div className="py-4 text-sm font-medium text-gray-600 whitespace-nowrap">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZone: "America/New_York",
                          hour12: false,
                        }) + " EST"
                        : "N/A"}
                    </div>
                  </td>
                  {/* ACTION */}
                  <td className="py-4 w-auto min-w-[180px] max-w-[280px] lg:min-w-[200px] lg:max-w-[300px]">
                    {/* Admin/Manager layout rules */}
                    {lead.assigned ? (
                      // Case 2: Lead is assigned → two vertical stacks side-by-side
                      <div className="flex items-start gap-2">
                        {session?.user_type !== 3 && (
                          <div className="flex flex-col gap-2">
                            <button
                              className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                              onClick={() => {
                                if (onViewDetails) {
                                  onViewDetails(lead);
                                } else {
                                  setSelectedLeadForDetails(lead);
                                  setShowDetailsModal(true);
                                }
                              }}
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </button>
                            {selectedLeads.length === 0 && (
                              <button
                                className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                                onClick={() => handleDeleteClick(lead._id as string)}
                              >
                                <Trash2 size={14} className="mr-1" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                            <span className="text-sm">
                              Assigned to {lead.assigned_to && typeof lead.assigned_to === "object"
                                ? (lead.assigned_to as any).full_name
                                : "Unknown User"}
                            </span>
                          </div>

                          {session?.user_type !== 3 && selectedLeads.length === 0 && (
                            <div className="dropdown relative">
                              <button
                                className="flex items-center justify-center px-4 py-2 border border-orange-300 rounded-md text-orange-600 hover:bg-orange-50 min-w-[140px]"
                                onClick={() => toggleDropdown(lead._id as string)}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                <span className="mr-1">Reassign</span>
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              {openDropdownId === lead._id && (
                                <div className="dropdown-menu absolute left-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                  <button
                                    onClick={() => {
                                      if (lead._id && onAssign) onAssign(lead._id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b border-gray-100"
                                  >
                                    Assign to Me
                                  </button>
                                  {loadingUsers ? (
                                    <div className="px-4 py-2 text-sm text-gray-500">Loading users...</div>
                                  ) : (
                                    availableUsers.length > 0 && (
                                      <div className="max-h-48 overflow-y-auto">
                                        {availableUsers.map((user) => (
                                          <button
                                            key={user._id}
                                            onClick={() => confirmAssign(lead._id as string, user._id)}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center justify-between"
                                          >
                                            <span>{user.full_name || user.user_name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Case 1: Lead is not assigned → all actions in one row (admin)
                      <div className="flex flex-row flex-wrap items-center gap-2">
                        {session?.user_type !== 3 && (
                          <>
                            <button
                              className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                              onClick={() => {
                                if (onViewDetails) {
                                  onViewDetails(lead);
                                } else {
                                  setSelectedLeadForDetails(lead);
                                  setShowDetailsModal(true);
                                }
                              }}
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </button>
                            {selectedLeads.length === 0 && (
                              <button
                                className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                                onClick={() => handleDeleteClick(lead._id as string)}
                              >
                                <Trash2 size={14} className="mr-1" />
                                Delete
                              </button>
                            )}
                            {selectedLeads.length === 0 && (
                              <div className="dropdown relative">
                                <button
                                  className="flex items-center justify-center px-4 py-2 border border-green-300 rounded-md text-blue-600 hover:bg-blue-50 min-w-[120px]"
                                  onClick={() => toggleDropdown(lead._id as string)}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  <span className="mr-1">Assign</span>
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                {openDropdownId === lead._id && (
                                  <div className="dropdown-menu absolute left-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                    <button
                                      onClick={() => {
                                        if (lead._id && onAssign) onAssign(lead._id);
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b border-gray-100"
                                    >
                                      Assign to Me
                                    </button>
                                    {loadingUsers ? (
                                      <div className="px-4 py-2 text-sm text-gray-500">Loading users...</div>
                                    ) : (
                                      availableUsers.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto">
                                          {availableUsers.map((user) => (
                                            <button
                                              key={user._id}
                                              onClick={() => confirmAssign(lead._id as string, user._id)}
                                              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center justify-between"
                                            >
                                              <span>{user.full_name || user.user_name}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          </>
                        )}

                        {session?.user_type == 3 && (
                          // Agent view (type 3)
                          <button
                            className="flex items-center px-4 py-2 border border-green-300 rounded-md text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              if (lead._id && onAssign) onAssign(lead._id);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Me
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showDeleteModal || showBatchDeleteModal) && (
        <ConfirmationModal
          title="Confirm Deletion"
          message={
            showBatchDeleteModal
              ? `Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`
              : "Are you sure you want to delete this lead? This action cannot be undone."
          }
          onCancel={() => {
            if (showBatchDeleteModal) {
              setShowBatchDeleteModal(false);
            } else {
              setShowDeleteModal(false);
              setLeadToDelete(null);
            }
          }}
          onConfirm={showBatchDeleteModal ? confirmBatchDelete : confirmDelete}
          confirmText={showBatchDeleteModal ? "Delete All" : "Delete"}
        />
      )}

      {/* Batch Assign Confirmation Modal */}
      {showBatchAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Assign {selectedLeads.length} Leads
            </h2>

            {session?.user_type === 3 ? (
              // Simple confirmation for user type 3
              <p className="text-gray-600 mb-6">
                Are you sure you want to assign {selectedLeads.length} leads to
                yourself?
              </p>
            ) : (
              // User selection interface for types 1 and 2
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Select a user to assign these leads to:
                </p>

                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    onClick={() => confirmBatchAssign()}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b border-gray-100"
                  >
                    Assign to Me
                  </button>

                  {loadingUsers ? (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      Loading users...
                    </div>
                  ) : (
                    availableUsers.length > 0 && (
                      <div className="max-h-60 overflow-y-auto">
                        {availableUsers.map((user) => (
                          <button
                            key={user._id}
                            onClick={() => confirmBatchAssign(user._id)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center justify-between border-b border-gray-100"
                          >
                            <span>{user.full_name || user.user_name}</span>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchAssignModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>

              {/* Show Confirm button only for type 3 users */}
              {session?.user_type === 3 && (
                <button
                  onClick={() => confirmBatchAssign()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Assign All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead Details Modal */}
      {showDetailsModal && selectedLeadForDetails && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          lead={selectedLeadForDetails}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLeadForDetails(null);
          }}
          categoryColors={categoryColors}
          getDomainLabel={getDomainLabel}
        />
      )}
    </div>
  );
};

export default LeadsTable;
