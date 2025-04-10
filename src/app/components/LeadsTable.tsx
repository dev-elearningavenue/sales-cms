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
} from "lucide-react";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";

// User type for the dropdown
interface User {
  _id: string;
  full_name: string;
  user_name: string;
  user_type: number;
}

interface LeadsTableProps {
  leads: ILead[];
  onAssign?: (leadId: string, userId?: string) => void;
  title: string;
  isMyLeads?: boolean;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  onDelete?: (leadId: string) => void;
}

const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onAssign,
  title,
  isMyLeads = false,
  showCreateButton = false,
  onCreateClick,
  onDelete,
}) => {
  const { session } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentStatus: ["Unpaid"],
    startDate: "",
    endDate: "",
    category: [] as string[],
    type: "",
    domain: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Add state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // Fetch available users for assignment
  useEffect(() => {
    if (session?.user_type === 1 || session?.user_type === 2) {
      fetchAvailableUsers();
    }
  }, [session]);

  // Additional effect to refresh users when batch modal opens
  useEffect(() => {
    if (
      showBatchAssignModal &&
      (session?.user_type === 1 || session?.user_type === 2)
    ) {
      fetchAvailableUsers();
    }
  }, [showBatchAssignModal]);

  // Function to fetch users with lower type than current user
  const fetchAvailableUsers = async () => {
    if (!session) return;

    setLoadingUsers(true);
    try {
      console.log("Fetching available users for user type:", session.user_type);
      // Fetch users with lower user_type than current user
      const response = await fetch("/api/users");
      const data = await response.json();

      if (response.ok && data.success && data.users) {
        // Filter users with lower user_type than current user
        const filteredUsers = data.users.filter(
          (user: User) =>
            user.user_type > session.user_type && user.user_type <= 3
        );

        console.log("Filtered users:", filteredUsers);
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
  const handleAssignToUser = (leadId: string, userId: string) => {
    if (onAssign) {
      onAssign(leadId, userId);
      setOpenDropdownId(null);
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

  // Filter leads based on search query and other filters
  const filteredLeads = leads.filter((lead) => {
    if (searchQuery) {
      // Search in customer name
      const nameMatch = (() => {
        const populatedKey = [
          "contact_us",
          "free_signup",
          "order_creation",
          "custom_lead",
          "abandoned_cart",
          "scholarship",
        ].find((key) => lead[key as keyof ILead]);

        if (!populatedKey) return false;

        const leadData = lead[populatedKey as keyof ILead];

        // Handle name formatting based on the populated key
        if (populatedKey === "contact_us") {
          return ((leadData as any)?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
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
          return fullName.includes(searchQuery.toLowerCase());
        }

        return false;
      })();

      // Search in email
      const emailMatch = (() => {
        const populatedKey = [
          "contact_us",
          "free_signup",
          "order_creation",
          "custom_lead",
          "abandoned_cart",
          "scholarship",
        ].find((key) => lead[key as keyof ILead]);

        if (!populatedKey) return false;

        const leadData = lead[populatedKey as keyof ILead];

        if (leadData && typeof leadData === "object") {
          const email =
            (leadData as any).email || (leadData as any).customerEmail || "";
          return email.toLowerCase().includes(searchQuery.toLowerCase());
        }

        return false;
      })();

      // Search in category or domain
      const categoryMatch = lead.category
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const domainMatch = lead.domain
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (!(nameMatch || emailMatch || categoryMatch || domainMatch)) {
        return false;
      }
    }

    // Apply other filters
    if (filters.type && lead.category !== filters.type) return false;
    if (filters.domain && lead.domain !== filters.domain) return false;
    // Check more filters if needed
    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLeads.length);
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  // console.log(
  //   "🔔 currentLeads",
  //   currentLeads[1],
  //   currentLeads[2],
  //   currentLeads[3]
  // );
  const domainMapping: Record<string, string> = {
    "Osha Outreach": "OOR",
    "Osha Online Center": "OOC",
    "Osha Education School": "OES",
  };

  const handleFilterChange = (category: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (category === "paymentStatus") {
        if (newFilters.paymentStatus.includes(value)) {
          newFilters.paymentStatus = newFilters.paymentStatus.filter(
            (status) => status !== value
          );
        } else {
          newFilters.paymentStatus = [...newFilters.paymentStatus, value];
        }
      } else if (category === "category") {
        if (newFilters.category.includes(value)) {
          newFilters.category = newFilters.category.filter(
            (cat) => cat !== value
          );
        } else {
          newFilters.category = [...newFilters.category, value];
        }
      } else if (category === "type") {
        newFilters.type = value;
      } else if (category === "domain") {
        newFilters.domain = domainMapping[value] || "";
      } else {
        (newFilters as any)[category] = value;
      }
      return newFilters;
    });
  };

  // Handle select all leads
  const handleSelectAll = () => {
    if (selectedLeads.length === currentLeads.length) {
      // If all are selected, unselect all
      setSelectedLeads([]);
    } else {
      // Otherwise, select all
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
      console.log("Batch assign clicked, user type:", session?.user_type);

      // Always show modal for all user types
      setShowBatchAssignModal(true);
    }
  };

  // Confirm batch assign
  const confirmBatchAssign = async (userId?: string) => {
    if (!onAssign || selectedLeads.length === 0) return;

    console.log("Confirming batch assign, userId:", userId || "current user");

    // Store count for notification
    const assignCount = selectedLeads.length;

    // Process each lead sequentially
    for (const leadId of selectedLeads) {
      onAssign(leadId, userId); // Pass userId if provided
    }

    // Emit a single notification after batch operation is complete
    if (window && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("batchAssign", {
          detail: { count: assignCount },
        })
      );
    }

    setShowBatchAssignModal(false);
    setSelectedLeads([]);
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    if (selectedLeads.length > 0) {
      setShowBatchDeleteModal(true);
    }
  };

  // Confirm batch delete
  const confirmBatchDelete = async () => {
    if (!onDelete || selectedLeads.length === 0) return;

    // Store count for notification
    const deletedCount = selectedLeads.length;

    // Process each lead sequentially
    for (const leadId of selectedLeads) {
      onDelete(leadId); // Pass flag to suppress individual notifications
    }

    // Emit a single notification after batch operation is complete
    if (window && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("batchDelete", {
          detail: { count: deletedCount },
        })
      );
    }

    setShowBatchDeleteModal(false);
    setSelectedLeads([]);
  };

  const getDomainLabel = (domain: string) => {
    switch (domain) {
      case "OOR":
        return "Osha Outreach";
      case "OOC":
        return "Osha Online Center";
      case "OES":
        return "Osha Education School";
      default:
        return domain;
    }
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

  // Handle delete click
  const handleDeleteClick = (leadId: string) => {
    setLeadToDelete(leadId);
    setShowDeleteModal(true);
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (leadToDelete && onDelete) {
      onDelete(leadToDelete);
      setShowDeleteModal(false);
      setLeadToDelete(null);
    }
  };

  // Check if any selected lead is already assigned
  const isAnySelectedLeadAssigned = () => {
    if (selectedLeads.length === 0) return false;

    return selectedLeads.some((leadId) => {
      const lead = leads.find((l) => l._id === leadId);
      return lead?.assigned === true;
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
                className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                onClick={() => {}}
              >
                <RefreshCcw className="h-5 w-5 text-gray-600" />
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
        <div className="flex flex-col text-xs md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search Lead"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
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
            Showing {startIndex + 1}-{endIndex} of {filteredLeads.length} leads
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                    className={`w-10 h-10 ${
                      currentPage === pageNum
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
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
                    className={`w-full px-4 py-2 text-left ${
                      itemsPerPage === value
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
          <div className="border border-gray-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium">Filters</h3>
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
                  ].map((domain) => (
                    <label key={domain} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={filters.domain === domainMapping[domain]}
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
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="overflow-x-auto">
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

            <tbody className="divide-y divide-gray-200">
              {currentLeads.map((lead, index) => (
                <tr key={lead._id || index} className="hover:bg-gray-50">
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
                    <div
                      className={`py-1 px-2 inline-block rounded-lg font-medium text-white ${
                        categoryColors[lead?.category ?? " "] || "bg-gray-500"
                      }`}
                    >
                      {lead?.category}
                    </div>
                  </td>
                  {/* Full Name */}
                  <td className="px-4 py-4">
                    <div className="py-4 text-sm font-medium text-gray-600">
                      {(lead.contact_us as any)?.name ||
                        [
                          lead.free_signup,
                          lead.order_creation,
                          lead.scholarship,
                          lead.custom_lead,
                          lead.abandoned_cart,
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
                    {getDomainLabel(lead.domain || "")}
                  </td>
                  {/* DATE CREATED */}
                  <td className="px-4 py-4 text-sm">
                    {lead.createdAt
                      ? new Date(lead.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </td>
                  {/* ACTION */}
                  <td className="py-4">
                    <div className="flex items-center justify-start gap-2">
                      {lead.assigned ? (
                        <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                          <span className="text-sm">
                            Assigned to{" "}
                            {lead.assigned_to &&
                            typeof lead.assigned_to === "object"
                              ? (lead.assigned_to as any).full_name
                              : "Unknown User"}
                          </span>
                        </div>
                      ) : (
                        <>
                          {session?.user_type !== 3 ? (
                            <>
                              <div className="dropdown relative mr-2">
                                <button
                                  className="flex items-center justify-center px-4 py-2 border border-green-300 rounded-md text-blue-600 hover:bg-blue-50 min-w-[120px]"
                                  onClick={() =>
                                    toggleDropdown(lead._id as string)
                                  }
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  <span className="mr-1">Assign</span>
                                  <ChevronDown className="h-4 w-4" />
                                </button>

                                {openDropdownId === lead._id && (
                                  <div className="dropdown-menu absolute left-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                    <button
                                      onClick={() => {
                                        if (lead._id && onAssign)
                                          onAssign(lead._id);
                                        setOpenDropdownId(null);
                                      }}
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
                                        <div className="max-h-48 overflow-y-auto">
                                          {availableUsers.map((user) => (
                                            <button
                                              key={user._id}
                                              onClick={() =>
                                                handleAssignToUser(
                                                  lead._id as string,
                                                  user._id
                                                )
                                              }
                                              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center justify-between"
                                            >
                                              <span>
                                                {user.full_name ||
                                                  user.user_name}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Delete button */}
                              <button
                                className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                                onClick={() =>
                                  handleDeleteClick(lead._id as string)
                                }
                              >
                                <Trash2 size={14} className="mr-1" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              className="flex items-center px-4 py-2 border border-green-300 rounded-md text-blue-600 hover:bg-blue-50 mr-2"
                              onClick={() => {
                                if (lead._id && onAssign) onAssign(lead._id);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign Me
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Confirm Deletion
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this lead? This action cannot be
              undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setLeadToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Confirm Batch Deletion
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedLeads.length} leads? This
              action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default LeadsTable;
