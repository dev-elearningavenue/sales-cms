import React from "react";
import { Eye, MessageSquare, Plus } from "lucide-react";
import { ILead } from "@/types/leads";
import { getLeadName } from "./LeadUtils";

interface MyLeadTableProps {
  currentLeads: ILead[];
  handleViewLead: (lead: ILead) => void;
  handleViewNotes: (lead: ILead) => void;
  handleStatusChange: (leadId: string, newStatus: string) => void;
  getFollowUpDisplayStatus: (lead: ILead) => string;
  getStatusOptionsForCategory: (category: string, lead?: ILead) => string[];
  handleSortChange: (field: string) => void;
  sort: { field: string; direction: "asc" | "desc" };
  categoryColors: Record<string, string>;
  getDomainLabel: (domain: string) => string;
}

const MyLeadTable: React.FC<MyLeadTableProps> = ({
  currentLeads,
  handleViewLead,
  handleViewNotes,
  handleStatusChange,
  getFollowUpDisplayStatus,
  getStatusOptionsForCategory,
  handleSortChange,
  sort,
  categoryColors,
  getDomainLabel,
}) => {
  return (
    <div className="bg-white shadow-md rounded-md overflow-hidden mt-2">
      <div className="max-h-[600px] overflow-auto">
        <table className="w-full border-collapse min-w-[650px]">
          <thead className="sticky top-0 bg-gray-50 shadow-sm">
            <tr>
              <th
                className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[20%]"
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
                className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[15%]"
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
                className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[15%]"
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
                className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[15%]"
                onClick={() => handleSortChange("updatedAt")}
              >
                <div className="flex items-center">
                  Last Updated
                  {sort.field === "updatedAt" && (
                    <span className="ml-1">
                      {sort.direction === "desc" ? "↓" : "↑"}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                Status
              </th>
              <th className="px-8 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
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
                  {/* Full Name */}
                  <td className="px-4 py-3">
                    <div className="py-1 px-2 inline-block text-sm font-medium text-gray-900 break-words">
                      {getLeadName(lead)}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <div
                      className={`py-1 px-2 inline-block rounded-lg text-sm font-medium text-white ${
                        categoryColors[lead?.category ?? ""] || "bg-gray-500"
                      }`}
                    >
                      {lead?.category}
                    </div>
                  </td>

                  {/* Domain */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {getDomainLabel(lead.domain || "")}
                    </div>
                  </td>

                  {/* Last Updated Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const dateToShow = lead.updatedAt || lead.assignedAt || lead.createdAt;
                        return dateToShow
                          ? new Date(dateToShow).toLocaleString("en-US", {
                              timeZone: "America/New_York",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }) + " EST"
                          : "N/A";
                      })()}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <select
                      className={`text-sm px-2 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                        lead.status === "Converted"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : (lead.status || "").startsWith("Follow Up")
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : lead.status === "Pending"
                          ? "bg-gray-100 text-gray-800 border-gray-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }`}
                      value={getFollowUpDisplayStatus(lead)}
                      onChange={(e) =>
                        handleStatusChange(lead._id as string, e.target.value)
                      }
                    >
                      <option value={getFollowUpDisplayStatus(lead)}>
                        {getFollowUpDisplayStatus(lead)}
                      </option>
                      {getStatusOptionsForCategory(lead.category || "", lead)
                        .filter((opt) => opt !== getFollowUpDisplayStatus(lead))
                        .map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                    </select>
                  </td>

                  {/* Actions - Stacked vertically */}
                  <td className="px-8 py-3 whitespace-nowrap">
                    <div className="flex flex-col space-y-2">
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm flex items-center justify-center relative"
                        onClick={() => handleViewNotes(lead)}
                      >
                        <MessageSquare size={14} className="mr-1" /> Notes
                        
                        {/* Notes Badge */}
                        {lead.notes &&
                          Array.isArray(lead.notes) &&
                          lead.notes.length > 0 && (
                            <span 
                              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                              title={`${lead.notes.length} note${lead.notes.length > 1 ? 's' : ''}`}
                            >
                              {lead.notes.length}
                            </span>
                          )}
                        
                        {/* Follow-ups Badge */}
                        {lead.next_follow_up &&
                          Array.isArray(lead.next_follow_up) &&
                          lead.next_follow_up.length > 0 && (
                            <span 
                              className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                              title={`${lead.next_follow_up.length} follow-up${lead.next_follow_up.length > 1 ? 's' : ''}`}
                            >
                              {lead.next_follow_up.length}
                            </span>
                          )}
                      </button>

                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm flex items-center justify-center"
                        onClick={() => handleViewLead(lead)}
                      >
                        <Eye size={14} className="mr-1" />
                        View Details...
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-xl font-medium mb-2">No leads found</p>
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
  );
};

export default MyLeadTable;
