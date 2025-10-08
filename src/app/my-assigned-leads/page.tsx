"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ICompanyLead } from "@/types/companyLead";
import { useApp } from "@/contexts/AppContext";
import { MAIN_STATUSES, STATUS_CATEGORIES, RESOLVE_STATUSES, getResolveStatusesForCategory } from "@/constants/statusHierarchy";
import { Eye, MessageSquare, RefreshCcw } from "lucide-react";
import NotesModal from "@/app/components/NotesModal";
import CompanyLeadModal from "@/app/components/CompanyLeadModal";

// Interface for pagination data
interface PaginationData {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function MyAssignedLeadsPage() {
    const { session, loading, showToast } = useApp();
    const router = useRouter();

    // State management
    const [allLeads, setAllLeads] = useState<ICompanyLead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<ICompanyLead[]>([]);
    const [displayedLeads, setDisplayedLeads] = useState<ICompanyLead[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });
    const [filters, setFilters] = useState({
        status: "",
        statusCategory: "",
        resolveStatus: "",
        search: "",
        dateFrom: "",
        dateTo: ""
    });

    // Notes modal state
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<ICompanyLead | null>(null);

    // Company lead modal state
    const [showCompanyLeadModal, setShowCompanyLeadModal] = useState(false);
    const [selectedLeadForModal, setSelectedLeadForModal] = useState<ICompanyLead | null>(null);

    // Cache state
    const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const CACHE_KEY = 'my-assigned-leads-cache';
    const UI_STATE_KEY = 'my-assigned-leads-ui-state';

    // Available resolve statuses based on selected category
    const availableResolveStatuses = filters.statusCategory
        ? getResolveStatusesForCategory(filters.statusCategory as any)
        : [];

    // Cache management functions
    const saveCacheToStorage = (leads: ICompanyLead[], timestamp: number) => {
        try {
            const cacheData = {
                leads,
                timestamp,
                userId: session?._id // Include user ID to prevent cross-user cache
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to save cache to localStorage:', error);
        }
    };

    const loadCacheFromStorage = () => {
        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                // Check if cache is for the same user and still valid
                if (parsed.userId === session?._id && (Date.now() - parsed.timestamp) < CACHE_DURATION) {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('Failed to load cache from localStorage:', error);
        }
        return null;
    };

    const clearCacheFromStorage = () => {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (error) {
            console.warn('Failed to clear cache from localStorage:', error);
        }
    };

    // UI state management functions
    const saveUIStateToStorage = (filters: any, pagination: any) => {
        try {
            const uiState = {
                filters,
                pagination,
                userId: session?._id,
                timestamp: Date.now()
            };
            localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
        } catch (error) {
            console.warn('Failed to save UI state to localStorage:', error);
        }
    };

    const loadUIStateFromStorage = () => {
        try {
            const uiStateData = localStorage.getItem(UI_STATE_KEY);
            if (uiStateData) {
                const parsed = JSON.parse(uiStateData);
                // Check if UI state is for the same user and not too old (1 hour)
                if (parsed.userId === session?._id && (Date.now() - parsed.timestamp) < 60 * 60 * 1000) {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('Failed to load UI state from localStorage:', error);
        }
        return null;
    };

    const clearUIStateFromStorage = () => {
        try {
            localStorage.removeItem(UI_STATE_KEY);
        } catch (error) {
            console.warn('Failed to clear UI state from localStorage:', error);
        }
    };

    // Redirect if not authenticated
    if (!loading && !session) {
        router.push("/login");
        return null;
    }

    const fetchAllLeads = async (forceRefresh = false) => {
        // First check localStorage cache
        const cachedData = loadCacheFromStorage();

        if (!forceRefresh && cachedData) {
            console.log("Using persistent cached leads data");
            setAllLeads(cachedData.leads);
            setCacheTimestamp(cachedData.timestamp);
            setIsInitialLoad(false);

            // Restore UI state (filters and pagination)
            const uiState = loadUIStateFromStorage();
            if (uiState) {
                console.log("Restoring UI state from localStorage");
                setFilters(uiState.filters);
                setPagination(uiState.pagination);
                applyFilters(cachedData.leads, uiState.filters);
            } else {
                applyFilters(cachedData.leads);
            }
            return;
        }

        // Fallback to in-memory cache
        const now = Date.now();
        const isCacheValid = cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION;

        if (!forceRefresh && isCacheValid && allLeads.length > 0) {
            console.log("Using in-memory cached leads data");
            setIsInitialLoad(false);
            return;
        }

        try {
            setDataLoading(true);
            console.log("Fetching fresh leads data...");

            const response = await fetch(`/api/company-leads/my-assigned?limit=1000`);
            const result = await response.json();

            if (result.success) {
                showToast(result.message || "Successfully fetched leads", "success")
                setAllLeads(result.leads || []);
                setCacheTimestamp(now);
                saveCacheToStorage(result.leads || [], now);
                applyFilters(result.leads || []);
            } else {
                showToast(result.message || "Failed to fetch leads", "error");
            }
        } catch (error) {
            console.error("Fetch assigned leads error:", error);
            showToast("Failed to fetch leads. Please try again.", "error");
        } finally {
            setDataLoading(false);
            setIsInitialLoad(false);
        }
    };

    // Frontend filtering function
    const applyFilters = (leadsToFilter = allLeads, customFilters = filters) => {
        let filtered = [...leadsToFilter];

        // Status filter
        if (customFilters.status) {
            filtered = filtered.filter(lead => lead.status === customFilters.status);
        }

        // Status category filter
        if (customFilters.statusCategory) {
            filtered = filtered.filter(lead => lead.statusCategory === customFilters.statusCategory);
        }

        // Resolve status filter
        if (customFilters.resolveStatus) {
            filtered = filtered.filter(lead => lead.resolveStatus === customFilters.resolveStatus);
        }

        // Search filter (frontend search across multiple fields)
        if (customFilters.search) {
            const searchTerm = customFilters.search.toLowerCase();
            filtered = filtered.filter(lead =>
                (lead.companyName?.toLowerCase().includes(searchTerm)) ||
                (lead.companyEmail?.toLowerCase().includes(searchTerm)) ||
                (lead.state?.toLowerCase().includes(searchTerm)) ||
                (lead.city?.toLowerCase().includes(searchTerm)) ||
                (lead.contactNo?.toLowerCase().includes(searchTerm)) ||
                (lead.contactPerson?.toLowerCase().includes(searchTerm)) ||
                (lead.contactPersonEmail?.toLowerCase().includes(searchTerm)) ||
                (lead.contactPersonPhone?.toLowerCase().includes(searchTerm))
            );
        }

        // Date range filter
        if (customFilters.dateFrom || customFilters.dateTo) {
            filtered = filtered.filter(lead => {
                if (!lead.assignedAt) return false;
                const assignedDate = new Date(lead.assignedAt);

                if (customFilters.dateFrom) {
                    const fromDate = new Date(customFilters.dateFrom);
                    if (assignedDate < fromDate) return false;
                }

                if (customFilters.dateTo) {
                    const toDate = new Date(customFilters.dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (assignedDate > toDate) return false;
                }

                return true;
            });
        }

        setFilteredLeads(filtered);

        // Update pagination
        const total = filtered.length;
        const pages = Math.ceil(total / pagination.limit);
        const currentPage = Math.min(pagination.page, pages || 1);

        setPagination(prev => ({
            ...prev,
            total,
            pages,
            page: currentPage
        }));

        // Set displayed leads for current page
        const startIndex = (currentPage - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        setDisplayedLeads(filtered.slice(startIndex, endIndex));
    };

    // Load all leads once on component mount
    useEffect(() => {
        if (session) {
            fetchAllLeads();
        }
    }, [session]);

    // Set initial load to false if we have cached data
    useEffect(() => {
        if (allLeads.length > 0) {
            setIsInitialLoad(false);
        }
    }, [allLeads]);

    // Apply filters when filters change
    useEffect(() => {
        if (allLeads.length > 0) {
            setPagination(prev => ({ ...prev, page: 1 }));
            applyFilters();
        }
    }, [filters, allLeads]);

    // Handle pagination changes (frontend pagination)
    const handlePageChange = (newPage: number) => {
        const newPagination = { ...pagination, page: newPage };
        setPagination(newPagination);
        saveUIStateToStorage(filters, newPagination);

        // Update displayed leads for new page
        const startIndex = (newPage - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        setDisplayedLeads(filteredLeads.slice(startIndex, endIndex));
    };

    // Handle filter changes with resolve status reset
    const handleFilterChange = (field: string, value: string) => {
        if (field === "statusCategory") {
            // Reset resolve status when category changes
            const newFilters = { ...filters, [field]: value, resolveStatus: "" };
            setFilters(newFilters);
            saveUIStateToStorage(newFilters, pagination);
        } else {
            const newFilters = { ...filters, [field]: value };
            setFilters(newFilters);
            saveUIStateToStorage(newFilters, pagination);
        }
    };

    const handleLeadClick = (lead: ICompanyLead) => {
        router.push(`/company-leads/${lead._id}`);
        // setSelectedLeadForModal(lead);
        // setShowCompanyLeadModal(true);
    };

    // Handle viewing notes modal
    const handleViewNotes = (lead: ICompanyLead) => {
        setSelectedLeadForNotes(lead);
        setShowNotesModal(true);
    };

    // Handle adding a note for company lead
    const handleNoteAdded = async (newNote: string) => {
        if (!selectedLeadForNotes) return;

        try {
            // Append the note to the existing notes string
            const currentNotes = selectedLeadForNotes.notes || "";
            const newNoteText = `[${new Date().toLocaleString()}] ${newNote}`;
            const updatedNotes = currentNotes ? `${newNoteText}\n\n${currentNotes}` : newNoteText;

            const response = await fetch(`/api/company-leads/${selectedLeadForNotes._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    notes: updatedNotes
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to add note");
            }

            // Update local state and refresh the lead data
            selectedLeadForNotes.notes = updatedNotes;

            // Also update in the main leads array
            const leadIndex = allLeads.findIndex(l => l._id === selectedLeadForNotes._id);
            if (leadIndex !== -1) {
                allLeads[leadIndex].notes = updatedNotes;
                applyFilters(); // Refresh displayed data
            }

            // Invalidate cache since data has been updated
            setCacheTimestamp(null);
            clearCacheFromStorage();

            showToast("Note added successfully", "success");
        } catch (error) {
            console.error("Error adding note:", error);
            showToast("Failed to add note", "error");
            throw error; // Re-throw so the modal can handle the error state
        }
    };

    const closeNotesModal = () => {
        setShowNotesModal(false);
        setSelectedLeadForNotes(null);
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

    // Pagination component
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

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                        let pageNum;
                        if (pages <= 5) {
                            pageNum = i + 1;
                        } else if (page <= 3) {
                            pageNum = i + 1;
                        } else if (page >= pages - 2) {
                            pageNum = pages - 4 + i;
                        } else {
                            pageNum = page - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-1 text-sm border rounded-md ${page === pageNum
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-300 text-black hover:bg-gray-50'
                                    }`}
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

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-full mx-auto px-4 sm:px-4 lg:px-4 py-2">
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm p-4 my-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assigned Leads</h1>
                            <p className="text-gray-600">
                                Manage all your assigned company leads in one place
                                {/* {cacheTimestamp && (
                                    <span className="ml-2 text-sm text-green-600">
                                        • Cached ({Math.round((Date.now() - cacheTimestamp) / 1000)}s ago)
                                    </span>
                                )} */}
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => fetchAllLeads(true)}
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
                                onClick={() => router.push('/company-leads')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                ← Back to OutBound
                            </button>
                        </div>
                    </div>


                    {/* Compact Single-Line Filters Section */}
                    <div className="filter-section bg-white rounded-lg shadow-sm p-4 mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            {/* Search - slightly wider */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange("search", e.target.value)}
                                    placeholder="Company, email, state..."
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Main Status */}
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

                            {/* Status Category */}
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

                            {/* Resolve Status */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Resolve</label>
                                <select
                                    value={filters.resolveStatus}
                                    onChange={(e) => handleFilterChange("resolveStatus", e.target.value)}
                                    className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${!filters.statusCategory ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                    disabled={!filters.statusCategory}
                                >
                                    <option value="">All</option>
                                    {availableResolveStatuses.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            {/* From Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* To Date */}
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

                    {/* Optimized Leads Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                Assigned Leads ({pagination.total})
                            </h3>
                            {/* Add Pagination */}
                        </div>
                        {pagination.pages > 1 && <PaginationComponent />}

                        {dataLoading && isInitialLoad ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-gray-500">Loading leads...</div>
                            </div>
                        ) : displayedLeads.length === 0 ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-gray-500">No assigned leads found</div>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                                                    Company & Contact
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                                                    Location
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                                    Category & Resolve
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                                                    Assigned
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {displayedLeads.map((lead) => (
                                                <tr key={String(lead._id)} className="hover:bg-gray-50">
                                                    {/* Company & Contact - Optimized width */}
                                                    <td className="px-4 py-4">
                                                        <div className="max-w-xs">
                                                            <div className="text-md font-medium text-gray-900 truncate">
                                                                <button
                                                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                                    onClick={() => window.open(`/company-leads/${lead._id}`, '_blank')}
                                                                >
                                                                    {lead.companyName}
                                                                </button>
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">
                                                                {lead.companyWebsite ? (
                                                                    <a
                                                                        href={lead.companyWebsite.startsWith('http') ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:underline"
                                                                    >
                                                                        {lead.companyWebsite}
                                                                    </a>
                                                                ) : 'No website available'}
                                                            </div>
                                                            <div className="text-sm text-black">
                                                                {lead.contactNo || lead.contactPersonPhone || 'No phone'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">
                                                                {lead.companyEmail || lead.contactPersonEmail || 'No email'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Location */}
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{lead.city || 'No City'}</div>
                                                        <div className="text-sm text-gray-500">{lead.state || 'N/A'}</div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                                                            {lead.status === "follow_up" ? "Follow Up" :
                                                                lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                                                        </span>
                                                    </td>

                                                    {/* Category & Resolve Status */}
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm text-gray-900">
                                                            {lead.statusCategory || 'Not Set'}
                                                        </div>
                                                        {lead.resolveStatus && (
                                                            <div className="text-xs text-gray-500 max-w-xs truncate">
                                                                {lead.resolveStatus}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Assigned Date */}
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : 'N/A'}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col space-y-2">
                                                            <button
                                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm flex items-center justify-center relative"
                                                                onClick={() => handleViewNotes(lead)}
                                                            >
                                                                <MessageSquare size={14} className="mr-1" /> Notes

                                                                {/* Notes Badge */}
                                                                {lead.notes && lead.notes.trim() && (
                                                                    <span
                                                                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                                                                        title="Has notes"
                                                                    >
                                                                        N
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
                                                                onClick={() => handleLeadClick(lead)}
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
                            </>
                        )}
                    </div>

                    {/* Reusable Notes Modal */}
                    <NotesModal
                        isOpen={showNotesModal}
                        onClose={closeNotesModal}
                        lead={selectedLeadForNotes}
                        leadType="company"
                        onNoteAdded={handleNoteAdded}
                    />

                    {/* Company Lead Modal */}
                    <CompanyLeadModal
                        isOpen={showCompanyLeadModal}
                        onClose={() => setShowCompanyLeadModal(false)}
                        lead={selectedLeadForModal}
                        onLeadUpdate={(updatedLead) => {
                            // Update the lead in the list
                            setAllLeads(prev =>
                                prev.map(lead =>
                                    lead._id === updatedLead._id ? updatedLead : lead
                                )
                            );
                            setFilteredLeads(prev =>
                                prev.map(lead =>
                                    lead._id === updatedLead._id ? updatedLead : lead
                                )
                            );
                            setDisplayedLeads(prev =>
                                prev.map(lead =>
                                    lead._id === updatedLead._id ? updatedLead : lead
                                )
                            );
                            // Invalidate cache since data has been updated
                            setCacheTimestamp(null);
                            clearCacheFromStorage();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
