"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IManagerLead } from "@/types/managerLead";
import { useApp } from "@/contexts/AppContext";
import { MAIN_STATUSES, STATUS_CATEGORIES, getResolveStatusesForCategory } from "@/constants/statusHierarchy";
import { Eye, MessageSquare, RefreshCcw } from "lucide-react";
import NotesModal from "@/app/components/NotesModal";

interface PaginationData {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function MyAssignedManagerLeadsPage() {
    const { session, loading, showToast } = useApp();
    const router = useRouter();

    const [allLeads, setAllLeads] = useState<IManagerLead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<IManagerLead[]>([]);
    const [displayedLeads, setDisplayedLeads] = useState<IManagerLead[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
    });
    const [filters, setFilters] = useState({
        status: "",
        statusCategory: "",
        resolveStatus: "",
        search: "",
        dateFrom: "",
        dateTo: "",
    });

    const [showNotesModal, setShowNotesModal] = useState(false);
    const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<IManagerLead | null>(null);

    const availableResolveStatuses = filters.statusCategory
        ? getResolveStatusesForCategory(filters.statusCategory as any)
        : [];

    if (!loading && !session) {
        router.push("/login");
        return null;
    }

    const fetchAllLeads = async () => {
        try {
            setDataLoading(true);
            const response = await fetch(`/api/manager-leads/my-assigned?limit=1000`);
            const result = await response.json();
            if (result.success) {
                setAllLeads(result.leads || []);
                applyFilters(result.leads || []);
            } else {
                showToast(result.message || "Failed to fetch leads", "error");
            }
        } catch (error) {
            console.error("Fetch assigned manager-leads error:", error);
            showToast("Failed to fetch leads. Please try again.", "error");
        } finally {
            setDataLoading(false);
        }
    };

    const applyFilters = (leadsToFilter = allLeads, customFilters = filters) => {
        let filtered = [...leadsToFilter];

        if (customFilters.status) filtered = filtered.filter(l => l.status === customFilters.status);
        if (customFilters.statusCategory) filtered = filtered.filter(l => l.statusCategory === customFilters.statusCategory);
        if (customFilters.resolveStatus) filtered = filtered.filter(l => l.resolveStatus === customFilters.resolveStatus);

        if (customFilters.search) {
            const s = customFilters.search.toLowerCase();
            filtered = filtered.filter(l =>
                (l.companyName?.toLowerCase().includes(s)) ||
                (l.companyEmail?.toLowerCase().includes(s)) ||
                (l.contactNo?.toLowerCase().includes(s)) ||
                (l.firstName?.toLowerCase().includes(s)) ||
                (l.lastName?.toLowerCase().includes(s))
            );
        }

        if (customFilters.dateFrom || customFilters.dateTo) {
            filtered = filtered.filter(l => {
                if (!l.assignedAt) return false;
                const d = new Date(l.assignedAt);
                if (customFilters.dateFrom && d < new Date(customFilters.dateFrom)) return false;
                if (customFilters.dateTo) {
                    const to = new Date(customFilters.dateTo);
                    to.setHours(23, 59, 59, 999);
                    if (d > to) return false;
                }
                return true;
            });
        }

        setFilteredLeads(filtered);
        const total = filtered.length;
        const pages = Math.ceil(total / pagination.limit);
        const currentPage = Math.min(pagination.page, pages || 1);
        setPagination(prev => ({ ...prev, total, pages, page: currentPage }));
        const startIndex = (currentPage - 1) * pagination.limit;
        setDisplayedLeads(filtered.slice(startIndex, startIndex + pagination.limit));
    };

    useEffect(() => {
        if (session) fetchAllLeads();
    }, [session]);

    useEffect(() => {
        if (allLeads.length > 0) {
            setPagination(prev => ({ ...prev, page: 1 }));
            applyFilters();
        }
    }, [filters, allLeads]);

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        const startIndex = (newPage - 1) * pagination.limit;
        setDisplayedLeads(filteredLeads.slice(startIndex, startIndex + pagination.limit));
    };

    const handleFilterChange = (field: string, value: string) => {
        if (field === "statusCategory") {
            setFilters({ ...filters, [field]: value, resolveStatus: "" });
        } else {
            setFilters({ ...filters, [field]: value });
        }
    };

    const handleViewNotes = (lead: IManagerLead) => {
        setSelectedLeadForNotes(lead);
        setShowNotesModal(true);
    };

    const handleNoteAdded = async (newNote: string) => {
        if (!selectedLeadForNotes) return;
        try {
            const currentNotes = selectedLeadForNotes.notes || "";
            const newNoteText = `[${new Date().toLocaleString()}] ${newNote}`;
            const updatedNotes = currentNotes ? `${newNoteText}\n\n${currentNotes}` : newNoteText;

            const response = await fetch(`/api/manager-leads/${selectedLeadForNotes._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: updatedNotes }),
            });
            if (!response.ok) throw new Error("Failed to add note");

            selectedLeadForNotes.notes = updatedNotes;
            const idx = allLeads.findIndex(l => l._id === selectedLeadForNotes._id);
            if (idx !== -1) {
                allLeads[idx].notes = updatedNotes;
                applyFilters();
            }
            showToast("Note added successfully", "success");
        } catch (error) {
            console.error("Error adding note:", error);
            showToast("Failed to add note", "error");
            throw error;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "processing": return "bg-blue-100 text-blue-800";
            case "resolved": return "bg-green-100 text-green-800";
            case "closed": return "bg-red-100 text-red-800";
            case "follow_up": return "bg-purple-100 text-purple-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const PaginationComponent = () => {
        const { page, pages, total, limit } = pagination;
        const startRecord = (page - 1) * limit + 1;
        const endRecord = Math.min(page * limit, total);
        return (
            <div className="pagination-component-wrapper flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-500">
                    Showing {startRecord} to {endRecord} of {total} results
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                        let pageNum;
                        if (pages <= 5) pageNum = i + 1;
                        else if (page <= 3) pageNum = i + 1;
                        else if (page >= pages - 2) pageNum = pages - 4 + i;
                        else pageNum = page - 2 + i;
                        return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-1 text-sm border rounded-md ${page === pageNum ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-black hover:bg-gray-50"}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= pages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-full mx-auto px-4 sm:px-4 lg:px-4 py-2">
                <div className="bg-white rounded-lg shadow-sm p-4 my-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assigned Manager Leads</h1>
                            <p className="text-gray-600">Manage all your assigned manager leads in one place</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => fetchAllLeads()}
                                disabled={dataLoading}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                            >
                                {dataLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Refresh
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => router.push("/manager-leads")}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                ← Back to Manager Leads
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="filter-section bg-white rounded-lg shadow-sm p-4 mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange("search", e.target.value)}
                                    placeholder="Company, name, email..."
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange("status", e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All</option>
                                    {Object.entries(MAIN_STATUSES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={filters.statusCategory}
                                    onChange={(e) => handleFilterChange("statusCategory", e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All</option>
                                    {Object.entries(STATUS_CATEGORIES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Resolve</label>
                                <select
                                    value={filters.resolveStatus}
                                    onChange={(e) => handleFilterChange("resolveStatus", e.target.value)}
                                    className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${!filters.statusCategory ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                    disabled={!filters.statusCategory}
                                >
                                    <option value="">All</option>
                                    {availableResolveStatuses.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                Assigned Manager Leads ({pagination.total})
                            </h3>
                        </div>
                        {pagination.pages > 1 && <PaginationComponent />}

                        {dataLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-gray-500">Loading leads...</div>
                            </div>
                        ) : displayedLeads.length === 0 ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-gray-500">No assigned manager leads found</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company & Contact</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category & Resolve</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {displayedLeads.map((lead) => (
                                            <tr key={String(lead._id)} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div className="max-w-xs">
                                                        <div className="text-md font-medium text-gray-900 truncate">
                                                            <button
                                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                                onClick={() => window.open(`/manager-leads?ml=${lead._id}`, "_blank")}
                                                            >
                                                                {lead.companyName}
                                                            </button>
                                                        </div>
                                                        <div className="text-sm text-black">{lead.contactNo || "No phone"}</div>
                                                        <div className="text-xs text-gray-500 truncate">{lead.companyEmail || "No email"}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                                                        {lead.status === "follow_up" ? "Follow Up" : lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm text-gray-900">{lead.statusCategory || "Not Set"}</div>
                                                    {lead.resolveStatus && (
                                                        <div className="text-xs text-gray-500 max-w-xs truncate">{lead.resolveStatus}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col space-y-2">
                                                        <button
                                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm flex items-center justify-center relative"
                                                            onClick={() => handleViewNotes(lead)}
                                                        >
                                                            <MessageSquare size={14} className="mr-1" /> Notes
                                                            {lead.notes && lead.notes.trim() && (
                                                                <span
                                                                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                                                                    title="Has notes"
                                                                >
                                                                    N
                                                                </span>
                                                            )}
                                                            {lead.next_follow_up && Array.isArray(lead.next_follow_up) && lead.next_follow_up.length > 0 && (
                                                                <span
                                                                    className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                                                                    title={`${lead.next_follow_up.length} follow-up${lead.next_follow_up.length > 1 ? "s" : ""}`}
                                                                >
                                                                    {lead.next_follow_up.length}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm flex items-center justify-center"
                                                            onClick={() => router.push(`/manager-leads?ml=${lead._id}`)}
                                                        >
                                                            <Eye size={14} className="mr-1" />
                                                            View Details...
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <NotesModal
                        isOpen={showNotesModal}
                        onClose={() => { setShowNotesModal(false); setSelectedLeadForNotes(null); }}
                        lead={selectedLeadForNotes}
                        leadType="company"
                        onNoteAdded={handleNoteAdded}
                    />
                </div>
            </div>
        </div>
    );
}
