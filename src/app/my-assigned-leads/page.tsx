"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ICompanyLead } from "@/types/companyLead";
import { useApp } from "@/contexts/AppContext";
import CompanyLeadDetailsModal from "@/app/components/CompanyLeadDetailsModal";

export default function MyAssignedLeadsPage() {
    const { session, loading, showToast } = useApp();
    const router = useRouter();

    // State management
    const [leads, setLeads] = useState<ICompanyLead[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [selectedLead, setSelectedLead] = useState<ICompanyLead | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "",
        search: "",
        dateFrom: "",
        dateTo: ""
    });

    // Redirect if not authenticated
    if (!loading && !session) {
        router.push("/login");
        return null;
    }

    // Fetch assigned leads
    const fetchAssignedLeads = async () => {
        try {
            setDataLoading(true);
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append("status", filters.status);
            if (filters.search) queryParams.append("search", filters.search);
            if (filters.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
            if (filters.dateTo) queryParams.append("dateTo", filters.dateTo);

            const response = await fetch(`/api/company-leads/my-assigned?${queryParams}`);
            const result = await response.json();

            if (result.success) {
                setLeads(result.leads || []);
            } else {
                showToast(result.message || "Failed to fetch leads", "error");
            }
        } catch (error) {
            console.error("Fetch assigned leads error:", error);
            showToast("Failed to fetch leads. Please try again.", "error");
        } finally {
            setDataLoading(false);
        }
    };

    // Load leads on component mount and filter changes
    useEffect(() => {
        if (session) {
            fetchAssignedLeads();
        }
    }, [session, filters]);

    const handleLeadClick = (lead: ICompanyLead) => {
        setSelectedLead(lead);
        setDetailsModalOpen(true);
    };

    const handleStatusUpdate = async (leadId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();
            if (result.success) {
                showToast("Lead status updated successfully!", "success");
                fetchAssignedLeads(); // Refresh the list
            } else {
                showToast(result.message || "Failed to update lead", "error");
            }
        } catch (error) {
            console.error("Update lead error:", error);
            showToast("Failed to update lead. Please try again.", "error");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "new": return "bg-blue-100 text-blue-800";
            case "contacted": return "bg-yellow-100 text-yellow-800";
            case "qualified": return "bg-green-100 text-green-800";
            case "converted": return "bg-purple-100 text-purple-800";
            case "lost": return "bg-red-100 text-red-800";
            case "follow_up": return "bg-orange-100 text-orange-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Assigned Leads</h1>
                            <p className="text-gray-600 text-lg">
                                Manage all your assigned company leads in one place
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/company-leads')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            ← Back to OutBound
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                placeholder="Company name, email..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                                <option value="follow_up">Follow Up</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Leads Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            Assigned Leads ({leads.length})
                        </h3>
                    </div>

                    {dataLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-gray-500">Loading leads...</div>
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-gray-500">No assigned leads found</div>
                        </div>
                    ) : (
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
                                            State
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Assigned Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {leads.map((lead) => (
                                        <tr key={lead._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {lead.companyName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {lead.companyWebsite || 'No website'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm text-gray-900">
                                                        {lead.companyEmail || 'No email'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {lead.contactNo || 'No phone'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{lead.city}</div>
                                                <div className="text-sm text-gray-500">{lead.state}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => handleLeadClick(lead)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    View Details
                                                </button>
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleStatusUpdate(lead._id, e.target.value)}
                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                >
                                                    <option value="new">New</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="qualified">Qualified</option>
                                                    <option value="converted">Converted</option>
                                                    <option value="lost">Lost</option>
                                                    <option value="follow_up">Follow Up</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Details Modal */}
                {selectedLead && (
                    <CompanyLeadDetailsModal
                        isOpen={detailsModalOpen}
                        onClose={() => {
                            setDetailsModalOpen(false);
                            setSelectedLead(null);
                        }}
                        lead={selectedLead}
                        onUpdate={() => {
                            fetchAssignedLeads();
                            setDetailsModalOpen(false);
                            setSelectedLead(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
