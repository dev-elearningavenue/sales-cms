"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  FileText,
  Loader2,
  X,
  Users,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Check,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import {
  canManageInvoices,
  isOwnInvoicesOnly,
  isPreSale,
} from "@/utils/userTypes";

interface Invoice {
  firstName: string;
  lastName: string;
  _id: string;
  invoiceNumber: string;
  email: string;
  contactNo?: string;
  totalPrice: number;
  dueDate: string;
  status: string;
  agentName: String;
  hostedUrl?: string;
  createdAt: string;
  siteName?: string;
  customerId?: string;
  invoice_status?: string;
  paidAt?: string;
}

interface AgentSales {
  agentId: string;
  agentName: string;
  totalSales: number;
  thisMonthSales: number;
  totalInvoices: number;
  paidInvoices: number;
}

const YourInvoicesPage = () => {
  // Filter state for admin
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>(""); // "today" or custom date

  const { session, showToast } = useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agentsSales, setAgentsSales] = useState<AgentSales[]>([]);
  const [sortBy, setSortBy] = useState<
    "dueDate" | "status" | "createdAt" | "paidAt" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // statusMap: { [id]: { invoice_status: string, paidAt?: string } }
  const [statusMap, setStatusMap] = useState<{
    [id: string]: { status: string; paidAt?: string };
  }>({});

  // ============ PAGINATION STATE ============
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ============ SEARCH STATE ============
  const [searchQuery, setSearchQuery] = useState("");
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [markPaidConfirmInvoiceId, setMarkPaidConfirmInvoiceId] = useState<string | null>(null);
  const [deleteConfirmInvoiceId, setDeleteConfirmInvoiceId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ============ CACHE (using ref for immediate access) ============
  const cacheRef = useRef<{
    invoices: Invoice[];
    highestPage: number;
    pageSize: number;
    filters: string; // JSON string of filters for cache invalidation
  }>({
    invoices: [],
    highestPage: 0,
    pageSize: 50,
    filters: "",
  });

  // Fetch agents sales for admin users
  const fetchAgentsSales = async () => {
    if (!session || !canManageInvoices(session.user_type))
      return;

    setAgentsLoading(true);
    try {
      const res = await fetch("/api/invoice/agents-sales");
      const data = await res.json();
      if (res.ok && data.success) {
        setAgentsSales(data.agentsSales || []);
      }
    } catch (err) {
      console.error("Failed to fetch agents sales:", err);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Fetch invoices with pagination and caching
  const fetchInvoices = async (
    page: number = currentPage,
    size: number = pageSize,
    forceRefresh: boolean = false
  ) => {
    const cache = cacheRef.current;

    // Build current filters string for cache comparison
    const currentFilters = JSON.stringify({ filterAgent, filterStatus, filterDate, searchQuery, userType: session?.user_type });

    // Check if filters changed
    const filtersChanged = currentFilters !== cache.filters;
    const pageSizeChanged = size !== cache.pageSize;
    const shouldClearCache = forceRefresh || filtersChanged || pageSizeChanged;

    if (shouldClearCache) {
      cache.invoices = [];
      cache.highestPage = 0;
      cache.pageSize = size;
      cache.filters = currentFilters;
    }

    // Check if we can serve from cache
    const startIndex = (page - 1) * size;
    const cachedInvoicesForPage = cache.invoices.slice(startIndex, startIndex + size);
    const hasFullPage = cachedInvoicesForPage.length === size;
    const isLastPageWithData = cache.invoices.length > startIndex && cache.invoices.length <= startIndex + size;

    if (!shouldClearCache && (hasFullPage || isLastPageWithData) && page <= cache.highestPage) {
      // Serve from cache
      setInvoices(cachedInvoicesForPage);
      setCurrentPage(page);
      setPageSize(size);
      return;
    }

    // Fetch from API
    setLoading(true);
    setError(null);

    try {
      let endpoint = "/api/invoice/your-invoices";
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: size.toString(),
      });

      if (session && canManageInvoices(session.user_type)) {
        endpoint = "/api/invoice";
        // Add filters for admin
        if (filterAgent) params.set("agentName", filterAgent);
        if (filterStatus) params.set("status", filterStatus);
        if (filterDate) params.set("date", filterDate);
        if (searchQuery) params.set("search", searchQuery);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        const fetchedInvoices = data.invoices || [];

        // Update cache
        if (shouldClearCache || page === 1) {
          cache.invoices = fetchedInvoices;
          cache.highestPage = 1;
        } else if (page > cache.highestPage) {
          cache.invoices = [...cache.invoices, ...fetchedInvoices];
          cache.highestPage = page;
        }

        setInvoices(fetchedInvoices);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        setError(data.error || "Failed to fetch invoices");
      }
    } catch (err) {
      setError("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchInvoices(1, pageSize, true);
      fetchAgentsSales();
    }
  }, [session]);

  // Refetch when filters change (admin only) - excluding search
  useEffect(() => {
    if (session && canManageInvoices(session.user_type)) {
      fetchInvoices(1, pageSize, true);
    }
  }, [filterAgent, filterStatus, filterDate]);

  // Debounced search - triggers API call 500ms after user stops typing
  useEffect(() => {
    if (!session || !canManageInvoices(session.user_type)) return;

    const debounceTimer = setTimeout(() => {
      fetchInvoices(1, pageSize, true);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle search submit
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchInvoices(1, pageSize, true);
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (invoiceId: string) => {
    setMarkingPaid(invoiceId);
    try {
      const response = await fetch("/api/invoice", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update the invoice in local state
        setInvoices(prevInvoices =>
          prevInvoices.map(inv =>
            inv._id === invoiceId
              ? { ...inv, status: "paid", paidAt: new Date().toISOString() }
              : inv
          )
        );
        // Also update cache
        cacheRef.current.invoices = cacheRef.current.invoices.map(inv =>
          inv._id === invoiceId
            ? { ...inv, status: "paid", paidAt: new Date().toISOString() }
            : inv
        );
        showToast("Invoice marked as paid successfully", "success");
      } else {
        showToast(result.error || "Failed to mark invoice as paid", "error");
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      showToast("Failed to mark invoice as paid. Please try again.", "error");
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleOpenMarkAsPaidConfirm = (invoiceId: string) => {
    setMarkPaidConfirmInvoiceId(invoiceId);
  };

  const confirmMarkAsPaid = async () => {
    if (!markPaidConfirmInvoiceId) return;
    const invoiceId = markPaidConfirmInvoiceId;
    setMarkPaidConfirmInvoiceId(null);
    await handleMarkAsPaid(invoiceId);
  };

  // Sort invoices (client-side sorting on current page data)
  let sortedInvoices = [...invoices];

  // Handle invoice deletion – open confirmation modal
  const handleDeleteInvoice = (invoiceId: string) => {
    setDeleteConfirmInvoiceId(invoiceId);
  };

  const confirmDeleteInvoice = async () => {
    if (!deleteConfirmInvoiceId) return;
    const invoiceId = deleteConfirmInvoiceId;
    setDeleteConfirmInvoiceId(null);

    try {
      const response = await fetch(`/api/invoice?id=${invoiceId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setInvoices(prevInvoices => prevInvoices.filter(inv => inv._id !== invoiceId));
        showToast("Invoice deleted successfully", "success");
      } else {
        showToast(result.error || "Failed to delete invoice", "error");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      showToast("Failed to delete invoice. Please try again.", "error");
    }
  };
  if (sortBy === "createdAt") {
    sortedInvoices.sort((a, b) => {
      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      return sortOrder === "asc"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    });
  } else if (sortBy === "paidAt") {
    sortedInvoices.sort((a, b) => {
      const aDate = new Date(a.paidAt || 0);
      const bDate = new Date(b.paidAt || 0);
      return sortOrder === "asc"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    });
  } else if (sortBy === "dueDate") {
    sortedInvoices.sort((a, b) => {
      const aDate = new Date(a.dueDate);
      const bDate = new Date(b.dueDate);
      return sortOrder === "asc"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    });
  } else if (sortBy === "status") {
    sortedInvoices.sort((a, b) => {
      const aStatus = a.status.toLowerCase();
      const bStatus = b.status.toLowerCase();
      if (aStatus === bStatus) return 0;
      if (sortOrder === "asc") return aStatus > bStatus ? 1 : -1;
      return aStatus < bStatus ? 1 : -1;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-full mx-auto">
        {/* Agents Sales Section - Only for Admin/Manager (hidden for Pre Sale) */}
        {session &&
          canManageInvoices(session.user_type) &&
          !isPreSale(session.user_type) && (
          <div className="mb-8">
            {/* <div className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-3">
                <Users className="text-blue-600" size={32} />
                All Agents Sales Overview
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Sales performance of all agents
              </p>
            </div> */}

            {agentsLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              </div>
            ) : agentsSales.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6">
                <div className="text-center mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-3">
                    <Users className="text-blue-600" size={32} />
                    All Agents Sales Overview
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    Sales performance of all agents
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {agentsSales.map((agent) => (
                    <div
                      key={agent.agentId}
                      className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 border border-blue-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                          {agent.agentName}
                        </h3>
                        <TrendingUp className="text-blue-600" size={20} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            Total Sales:
                          </span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            ${agent.totalSales.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            This Month:
                          </span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            ${agent.thisMonthSales.toFixed(2)}
                          </span>
                        </div>

                        {/* <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            Invoices:
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {agent.paidInvoices}/{agent.totalInvoices}
                          </span>
                        </div> */}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="mt-6 bg-blue-50 dark:bg-gray-900 rounded-xl p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        $
                        {agentsSales
                          .reduce((sum, agent) => sum + agent.totalSales, 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Sales
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        $
                        {agentsSales
                          .reduce((sum, agent) => sum + agent.thisMonthSales, 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        This Month
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {sortedInvoices.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {agentsSales.reduce(
                          (sum, agent) => sum + agent.paidInvoices,
                          0
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Paid Invoices
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {agentsSales.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Active Agents
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
                <div className="flex flex-col items-center py-12">
                  <Users className="text-gray-400 mb-2" size={32} />
                  <span className="text-gray-600 font-semibold">
                    No agents sales data available.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {session && isOwnInvoicesOnly(session.user_type) && (
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2">
              Your Invoices
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              View all invoices you have created
            </p>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 md:p-8">
          {/* Stats for non-admin users */}
          {session && isOwnInvoicesOnly(session.user_type) && invoices.length > 0 && (
            <div className="bg-blue-50 dark:bg-gray-900 rounded-xl mb-4 py-4 px-4 flex flex-col md:flex-row justify-center items-center gap-4 w-full">
              <span className="text-2xl md:text-2xl font-bold text-blue-700 dark:text-blue-300 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                Total: {totalCount}
              </span>
              <span className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                Paid: {sortedInvoices.filter((inv) => inv.status === "paid").length}
              </span>
              <span className="text-xl md:text-2xl font-bold text-yellow-700 dark:text-yellow-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                Pending: {sortedInvoices.filter((inv) => inv.status !== "paid").length}
              </span>
              <span className="text-xl md:text-2xl font-bold text-purple-700 dark:text-purple-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                This Month Sales: $
                {(() => {
                  const currentMonth = new Date().getMonth();
                  const currentYear = new Date().getFullYear();
                  return sortedInvoices
                    .filter((inv) => {
                      if (inv.status !== "paid") return false;
                      const paidDate = new Date(inv.paidAt!);
                      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, inv) => sum + inv.totalPrice, 0)
                    .toFixed(2);
                })()}
              </span>
              <span className="text-lg md:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                Total Paid: ${sortedInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.totalPrice, 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Filters and Search - Always visible for admin */}
          {session && canManageInvoices(session.user_type) && (
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-center flex-wrap">
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm w-40 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Agents</option>
                <option value="Arhum Naveed">Arhum Naveed</option>
                <option value="Wania Awan">Wania Awan</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm w-40 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm w-40 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
              </select>
              <input
                type="date"
                value={filterDate && filterDate !== "today" ? filterDate : ""}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm w-40 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoices..."
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-sm w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
                >
                  <Search size={18} />
                </button>
              </form>
              {/* Refresh invoices */}
              <button
                type="button"
                onClick={async () => {
                  setRefreshing(true);
                  await fetchInvoices(currentPage, pageSize, true);
                  setRefreshing(false);
                }}
                disabled={refreshing}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                title="Refresh invoices"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
              {/* Clear filters button */}
              {(filterAgent || filterStatus || filterDate || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterAgent("");
                    setFilterStatus("");
                    setFilterDate("");
                    setSearchQuery("");
                    fetchInvoices(1, pageSize, true);
                  }}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Top Pagination Controls */}
          {!loading && invoices.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 px-4 border-b border-gray-200 dark:border-gray-600 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} invoices
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setRefreshing(true);
                    await fetchInvoices(currentPage, pageSize, true);
                    setRefreshing(false);
                  }}
                  disabled={refreshing}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-50"
                  title="Refresh invoices"
                >
                  <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                  disabled={currentPage === 1}
                  onClick={() => fetchInvoices(1, pageSize)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                  disabled={currentPage === 1}
                  onClick={() => fetchInvoices(Math.max(currentPage - 1, 1), pageSize)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                <button
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => fetchInvoices(Math.min(currentPage + 1, totalPages), pageSize)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => fetchInvoices(totalPages, pageSize)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
                <div className="relative group ml-2">
                  <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800">
                    {pageSize}/page
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg overflow-hidden z-20 hidden group-hover:block">
                    {[50, 100, 200].map((value) => (
                      <button
                        key={value}
                        className={`w-full px-4 py-2 text-left text-sm ${pageSize === value ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                        onClick={() => {
                          setPageSize(value);
                          fetchInvoices(1, value, true);
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12">
              <X className="text-red-500 mb-2" size={32} />
              <span className="text-red-600 font-semibold">{error}</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <FileText className="text-gray-400 dark:text-gray-500 mb-2" size={32} />
              <span className="text-gray-600 dark:text-gray-300 font-semibold">
                No invoices found.
              </span>
              {(filterAgent || filterStatus || filterDate || searchQuery) && (
                <span className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  Try adjusting your filters or search query
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto md:-mx-6">
                <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 rounded-sm">
                    <tr>
                      {/* # */}
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        #
                      </th>
                      {/* Invoice # */}
                      {/* <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invoice #
                      </th> */}
                      {/* Customer */}
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                      {/* Created At */}
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => {
                          setSortBy("createdAt");
                          setSortOrder(
                            sortBy === "createdAt" && sortOrder === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Created
                        <span className="ml-2 text-xs">
                          {sortBy === "createdAt"
                            ? sortOrder === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </span>
                      </th>
                      {/* Total Price */}
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      {/* Due Date */}
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => {
                          setSortBy("dueDate");
                          setSortOrder(
                            sortBy === "dueDate" && sortOrder === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Due Date
                        <span className="ml-2 text-xs">
                          {sortBy === "dueDate"
                            ? sortOrder === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </span>
                      </th>
                      {/* Status */}
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => {
                          setSortBy("status");
                          setSortOrder(
                            sortBy === "status" && sortOrder === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Status
                        <span className="ml-2 text-xs">
                          {sortBy === "status"
                            ? sortOrder === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </span>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedInvoices.map((inv, idx) => (
                      <tr
                        key={inv._id}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                      >
                        {/* INDEX */}
                        <td className="px-3 py-4 font-mono text-gray-500 dark:text-gray-400 font-bold">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        {/* INVOICE NUMBER */}
                        {/* <td className="px-3 py-4 font-mono text-blue-700 dark:text-blue-300">
                          {inv.hostedUrl && (
                            <a
                              href={inv.hostedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {inv.invoiceNumber}
                            </a>
                          )}
                        </td> */}
                        {/* CUSTOMER INFO*/}
                        <td className="px-3 py-4 text-gray-800 dark:text-white w-48">
                          <div
                            className="max-w-full font-bold truncate"
                            title={`${inv.firstName} ${inv.lastName}`.trim()}
                          >
                            <a
                              href={`/invoice/customer?${new URLSearchParams({
                                ...(inv.email ? { email: inv.email } : {}),
                                ...(inv.contactNo ? { contact: inv.contactNo } : {}),
                              }).toString()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-300 hover:underline cursor-pointer"
                            >
                              {inv.firstName} {inv.lastName}
                            </a>
                          </div>
                          <div
                            className="max-w-full font-bold text-xs truncate"
                            title={inv.siteName}
                          >
                            {inv.siteName}
                          </div>
                          <div
                            className="max-w-full text-sm truncate"
                            title={inv.email}
                          >
                            {inv.email}
                          </div>
                          {inv.contactNo && (
                            <div
                              className="max-w-full text-xs text-gray-500 dark:text-gray-300 truncate"
                              title={inv.contactNo}
                            >
                              📞 {inv.contactNo}
                            </div>
                          )}
                        </td>
                        {/* CREATED AT | AGENT NAME */}
                        {session && isOwnInvoicesOnly(session.user_type) ? (
                          <td className="px-3 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider whitespace-nowrap">
                            {new Date(inv.createdAt).toLocaleString()}
                            <div
                              className="max-w-full text-sm truncate"
                              title={inv.invoiceNumber}
                            >
                              ID: {inv.invoiceNumber}
                            </div>
                          </td>
                        ) : (
                          <td className="px-3 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap">
                            <div className="text-sm font-bold uppercase text-lime-600 dark:text-lime-300">
                              {inv.agentName}
                            </div>
                            <div className="text-gray-800 dark:text-gray-100">
                              {new Date(inv.createdAt).toLocaleString()}
                            </div>
                            <div
                              className="max-w-full text-sm truncate text-gray-800 dark:text-gray-100"
                              title={inv.invoiceNumber}
                            >
                              ID: {inv.invoiceNumber}
                            </div>
                          </td>
                        )}
                        {/* TOTAL */}
                        <td className="px-3 py-4 font-semibold text-green-700 dark:text-green-400">
                          ${inv.totalPrice.toFixed(2)}
                        </td>
                        {/* DUE DATE */}
                        <td className="px-3 py-4 text-gray-800 dark:text-white">
                          {inv.status === "paid" && inv.paidAt ? (
                            <span>
                              <span className="font-semibold text-green-600 dark:text-green-300">
                                Paid At:
                              </span>{" "}
                              <span className="text-sm ">
                                {new Date(inv.paidAt!).toLocaleString()}
                              </span>{" "}
                            </span>
                          ) : (
                            new Date(inv.dueDate).toLocaleString()
                          )}
                        </td>
                        {/* STATUS */}
                        <td className="px-3 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${inv.status === "paid"
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : inv.status === "unpaid"
                                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                                : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                              }`}
                          >
                            {inv.status.charAt(0).toUpperCase() +
                              inv.status.slice(1)}
                          </span>
                        </td>
                        {/* ACTIONS */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {inv.hostedUrl && (
                              <button
                                type="button"
                                className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                                onClick={() => {
                                  window.open(
                                    inv.hostedUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                View
                                <ArrowUpRight size={14} className="mr-1" />
                              </button>
                            )}
                            {/* Mark as Paid button - only for admin/manager and unpaid invoices */}
                            {session && !isOwnInvoicesOnly(session.user_type) && inv.status !== "paid" && (
                              <button
                                type="button"
                                className="flex items-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm disabled:opacity-50"
                                onClick={() => handleOpenMarkAsPaidConfirm(inv._id)}
                                disabled={markingPaid === inv._id}
                              >
                                {markingPaid === inv._id ? (
                                  <Loader2 size={14} className="animate-spin mr-1" />
                                ) : (
                                  <Check size={14} className="mr-1" />
                                )}
                                Paid
                              </button>
                            )}
                            {(session && !isOwnInvoicesOnly(session.user_type)) && (
                              <button
                                type="button"
                                className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                                onClick={() => handleDeleteInvoice(inv._id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4 px-4">
                  {/* Pagination Summary */}
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} invoices
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                      disabled={currentPage === 1}
                      onClick={() => fetchInvoices(1, pageSize)}
                    >
                      <ChevronsLeft className="h-5 w-5" />
                    </button>
                    <button
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                      disabled={currentPage === 1}
                      onClick={() => fetchInvoices(Math.max(currentPage - 1, 1), pageSize)}
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
                            className={`w-10 h-10 border rounded-md ${currentPage === pageNum
                              ? "bg-blue-500 text-white font-medium border-blue-500"
                              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                              }`}
                            onClick={() => fetchInvoices(pageNum, pageSize)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <span className="flex items-center px-2 text-gray-600 dark:text-gray-400">...</span>
                      )}
                    </div>

                    <button
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => fetchInvoices(Math.min(currentPage + 1, totalPages), pageSize)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => fetchInvoices(totalPages, pageSize)}
                    >
                      <ChevronsRight className="h-5 w-5" />
                    </button>

                    <div className="relative group ml-4">
                      <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800">
                        {pageSize} / page
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg overflow-hidden z-20 hidden group-hover:block">
                        {[50, 100, 200].map((value) => (
                          <button
                            key={value}
                            className={`w-full px-4 py-2 text-left text-sm ${pageSize === value ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                            onClick={() => {
                              setPageSize(value);
                              fetchInvoices(1, value, true);
                            }}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {deleteConfirmInvoiceId && (
        <ConfirmationModal
          title="Delete invoice"
          message="Are you sure you want to delete this invoice? This action cannot be undone."
          onCancel={() => setDeleteConfirmInvoiceId(null)}
          onConfirm={confirmDeleteInvoice}
          confirmText="Delete"
        />
      )}

      {markPaidConfirmInvoiceId && (
        <ConfirmationModal
          title="Mark invoice as paid"
          message="Are you sure you want to mark this invoice as paid?"
          onCancel={() => setMarkPaidConfirmInvoiceId(null)}
          onConfirm={confirmMarkAsPaid}
          confirmText="Mark as paid"
        />
      )}
    </div>
  );
};

export default YourInvoicesPage;
