// components/LeadsTable.tsx
import { useState } from "react";
import DatePicker from "react-datepicker";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Search,
  RefreshCcw,
  Calendar,
  Eye,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { ILead } from "@/types/leads";

interface LeadsTableProps {
  leads: ILead[];
  onAssign: (leadId: string) => void;
  title: string;
  isMyLeads?: boolean;
}

const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onAssign,
  title,
  isMyLeads = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentStatus: ["Unpaid"],
    startDate: "",
    endDate: "",
    category: [] as string[],
    type: "",
  });

  const filteredLeads = leads.filter((lead) => {
    if (filters.type && lead.category !== filters.type) return false;
    // Agar aur filters add karne hon to yahan check karein
    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, leads.length);
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

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
      } else {
        (newFilters as any)[category] = value;
      }
      console.log("Updated Filters:", newFilters);
      return newFilters;
    });
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

  const getStatusLabel = (status?: string) => {
    if (!status) return "New";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getLeadSourceInfo = (lead: ILead) => {
    if (lead.contact_us) return "Contact Us";
    if (lead.scholarship) return "Scholarship";
    if (lead.free_signup) return "Free SignUp";
    if (lead.abandoned_cart) return "Abandoned Cart";
    return "Direct";
  };

  const categoryColors: Record<string, string> = {
    "Abandoned Cart": "bg-red-500",
    "Order Creation": "bg-blue-500",
    "Contact Us": "bg-green-500",
    "Free SignUp": "bg-purple-500",
    "Free Study Guide": "bg-yellow-500",
    Scholarship: "bg-amber-500",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        <h1 className="text-base font-medium text-gray-700 mb-4">{title}</h1>

        {/* Search and Date Filters Row */}
        <div className="flex flex-col text-xs md:flex-row md:items-center gap-3 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search Lead"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

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
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
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

        {/* Filters and Pagination Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>
          {/* Pagination Summary */}
          <div className="mt-4 text-xs text-gray-600">
            Showing {startIndex + 1}-{endIndex} of {leads.length} leads
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
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={currentPage === totalPages}
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
              {/* <div>
                <h4 className="font-medium mb-3">Lead Status</h4>
                <div className="space-y-2">
                  {["New", "Contacted", "Qualified", "Converted", "Closed"].map(
                    (status) => (
                      <label
                        key={status}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={filters.paymentStatus.includes(status)}
                          onChange={() =>
                            handleFilterChange("paymentStatus", status)
                          }
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{status}</span>
                      </label>
                    )
                  )}
                </div>
              </div> */}

              <div>
                <h4 className="font-medium mb-3">Lead Categories</h4>
                <div className="space-y-2">
                  {[
                    "Contact Us",
                    "Free SignUp",
                    "Free Study Guide",
                    "Scholarship",
                    "Abandoned Cart",
                    "Scholarship",
                  ].map((category) => (
                    <label
                      key={category}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={filters.category.includes(category)}
                        onChange={() =>
                          handleFilterChange("category", category)
                        }
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Domain</h4>
                <div className="space-y-2">
                  {["OOR", "OOC", "OES"].map((domain) => (
                    <label key={domain} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{getDomainLabel(domain)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowFilters(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-y-auto" style={{ height: "600px" }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 text-sm bg-white shadow-md z-10">
              <tr>
                <th className="w-12 px-2 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 relative group">
                  <span>TYPE</span>
                  <button className="ml-1">
                    <Filter className="h-4 w-4 text-gray-500" />
                  </button>
                  {/* Dropdown menu (show on hover of header) */}
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
                  {isMyLeads ? "LEAD SOURCE" : "DOMAIN"}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  CREATED AT
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
                  <td className="py-4">
                    {
                      <div className="space-y-2">
                        <div className="px-2 py-2 inline-block rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getDomainLabel(lead.domain)}
                        </div>
                      </div>
                    }
                  </td>
                  {/* CREATED AT */}
                  <td className="py-4 text-sm whitespace-nowrap">
                    {lead.createdAt
                      ? new Date(lead.createdAt).toLocaleString()
                      : "N/A"}
                    {/* {lead.next_follow_up_date && (
                      <div className="mt-1 text-xs text-gray-500">
                        Next Follow-up:{" "}
                        {new Date(
                          lead.next_follow_up_date
                        ).toLocaleDateString()}
                      </div>
                    )} */}
                    {/* <div className="space-y-1">
                      <div>
                        Lead ID:{" "}
                        <span className="font-medium">
                          {lead._id?.substring(0, 8) || "New"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Assigned:{" "}
                        <span className="font-medium">
                          {lead.assigned ? "Yes" : "No"}
                        </span>
                      </div>
                      {lead.resolve_status && (
                        <div className="text-sm text-gray-600">
                          Resolution:{" "}
                          <span className="font-medium">
                            {lead.resolve_status}
                          </span>
                        </div>
                      )}
                    </div> */}
                  </td>
                  {/* ACTION */}
                  <td className="py-4">
                    <div className="flex flex-col gap-2">
                      {lead.assigned ? (
                        <div className="flex items-center justify-center w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                          <span className="text-sm">
                            Assigned to{" "}
                            {lead.assigned_to &&
                            typeof lead.assigned_to === "object"
                              ? (lead.assigned_to as any).full_name
                              : "Unknown User"}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (lead._id) onAssign(lead._id);
                          }}
                          className="flex items-center justify-center w-full px-3 py-2 border border-green-300 rounded-md text-blue-600 hover:bg-blue-50"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Assign Me
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadsTable;
