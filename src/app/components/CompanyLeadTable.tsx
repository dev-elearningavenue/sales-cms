import React from "react";
import { ICompanyLead } from "@/types/companyLead";

interface CompanyLeadTableProps {
    leads: ICompanyLead[];
    loading: boolean;
    onLeadSelect: (lead: ICompanyLead) => void;
    onLeadUpdate: (leadId: string, updates: Partial<ICompanyLead>) => void;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
    onPageChange: (page: number) => void;
}

const CompanyLeadTable: React.FC<CompanyLeadTableProps> = ({
    leads,
    loading,
    onLeadSelect,
    onLeadUpdate,
    pagination,
    onPageChange,
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "new":
                return "bg-gray-100 text-gray-800";
            case "contacted":
                return "bg-blue-100 text-blue-800";
            case "qualified":
                return "bg-yellow-100 text-yellow-800";
            case "converted":
                return "bg-green-100 text-green-800";
            case "lost":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString();
    };

    const handleStatusChange = (leadId: string, newStatus: string) => {
        onLeadUpdate(leadId, { status: newStatus as any });
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Follow-up
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                        <tr key={String(lead._id)} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <div className="text-sm font-medium text-gray-900">
                                        {lead.companyName}
                                    </div>
                                    <div className="text-sm text-gray-500">{lead.domain}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <div className="text-sm text-gray-900">{lead.companyEmail}</div>
                                    <div className="text-sm text-gray-500">{lead.contactNo}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <div className="text-sm text-gray-900">{lead.state}</div>
                                    <div className="text-sm text-gray-500">{lead.city}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <select
                                    value={typeof lead.status === "string" ? lead.status : ""}
                                    onChange={(e) => handleStatusChange(lead._id!.toString(), e.target.value as string)}
                                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}
                                >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="converted">Converted</option>
                                    <option value="lost">Lost</option>
                                </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {lead.assignedTo ? (
                                    <div className="flex flex-col">
                                        <div>
                                            {/* {lead.assignedTo.firstName} {lead.assignedTo.lastName} */}"Unknown User"
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(lead.assignedAt!)}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-gray-400">Unassigned</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {lead.nextFollowUp ? (
                                    formatDate(lead.nextFollowUp)
                                ) : (
                                    <span className="text-gray-400">Not scheduled</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                    onClick={() => onLeadSelect(lead)}
                                    className="text-blue-600 hover:text-blue-900"
                                >
                                    View Details
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing{" "}
                                <span className="font-medium">
                                    {(pagination.page - 1) * pagination.limit + 1}
                                </span>{" "}
                                to{" "}
                                <span className="font-medium">
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>{" "}
                                of{" "}
                                <span className="font-medium">{pagination.total}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => onPageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                {[...Array(pagination.pages)].map((_, i) => {
                                    const page = i + 1;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => onPageChange(page)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.page
                                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => onPageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyLeadTable;
