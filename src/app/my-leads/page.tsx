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
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/Dialog";
import { Customer, Field } from "@/components/Customer";
import CourseInfo from "@/components/CourseInfo";

const STATUS_OPTIONS = [
  "Follow Up",
  "Resolved",
  "Pending",
  "Converted",
  "Assigned Orders",
];

// Domain mapping for labels
const DOMAIN_LABELS = {
  OOR: "Osha Outreach",
  OOC: "Osha Online Center",
  OES: "Osha Education School",
};

const MyLeads = () => {
  // State management
  const [userLeads, setUserLeads] = useState<ILead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const { session, fetchSession } = useApp();

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

  useEffect(() => {
    fetchSession();
  }, []);

  // Fetch leads when session is available
  useEffect(() => {
    const fetchUserLeads = async () => {
      try {
        if (!session?._id) return;

        const res = await fetch(`/api/my-leads?userId=${session._id}`);
        const data = await res.json();
        setUserLeads(data.leads);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?._id) {
      fetchUserLeads();
    }
  }, [session]);

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
  const processedLeads = getFilteredLeads(getSortedLeads(userLeads));

  // Pagination calculation
  const totalLeadCount = processedLeads.length;
  const totalPages = Math.ceil(totalLeadCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalLeadCount);
  const currentLeads = processedLeads.slice(startIndex, endIndex);

  // Handle status change for a lead
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/my-leads/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const updatedLead = await res.json();

      setUserLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead._id === leadId ? { ...lead, status: updatedLead.status } : lead
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
    }
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
  const handleViewLead = (lead: ILead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
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
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {loading ? (
        <LoadingSkeleton component="my leads" />
      ) : (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">My Leads</h1>

            {/* Filters and Pagination Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span>
                    {showFiltersPanel ? "Hide Filters" : "Show Filters"}
                  </span>
                </button>

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

              {/* Pagination Summary */}
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-medium">
                  {startIndex + 1}-{endIndex}
                </span>{" "}
                of <span className="font-medium">{totalLeadCount}</span> leads
              </div>
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
                    {STATUS_OPTIONS.map((status) => (
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
                            <div className="text-sm font-medium text-gray-900">
                              {getDomainLabel(lead.domain || "")}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {lead.category}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {lead.createdAt
                                ? new Date(lead.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )
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
                              value={lead.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  lead._id as string,
                                  e.target.value
                                )
                              }
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleViewLead(lead)}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                            >
                              <Eye size={16} />
                              <span>View Lead</span>
                            </button>
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
                {selectedLead?.category === "Order Creation" ||
                  (selectedLead?.category === "Abandoned Cart" && (
                    <CourseInfo selectedLead={selectedLead} />
                  ))}

                {/* Customer Information */}
                <Customer selectedLead={selectedLead} />

                {/* Lead Details */}
                {/*
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Additional Details
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(selectedLead)
                          .filter(
                            ([key]) =>
                              ![
                                "_id",
                                "customerName",
                                "customerEmail",
                                "customerPhone",
                                "domain",
                                "category",
                                "status",
                                "createdAt",
                              ].includes(key)
                          )
                          .map(([key, value]) => (
                            <div key={key}>
                              <h4 className="text-sm font-medium text-gray-500">
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (str) => str.toUpperCase())}
                              </h4>
                              <p className="mt-1 text-gray-900 break-words">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value || "N/A")}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                */}

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
                    {STATUS_OPTIONS.map((status) => (
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
    </div>
  );
};

export default MyLeads;
