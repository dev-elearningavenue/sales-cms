"use client";
import React, { useEffect, useState } from "react";
import { FileText, Loader2, X, Users, TrendingUp } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerEmail: string;
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

  const { session } = useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agentsSales, setAgentsSales] = useState<AgentSales[]>([]);
  const [sortBy, setSortBy] = useState<"dueDate" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // statusMap: { [id]: { invoice_status: string, paidAt?: string } }
  const [statusMap, setStatusMap] = useState<{
    [id: string]: { status: string; paidAt?: string };
  }>({});

  // Fetch agents sales for admin users
  const fetchAgentsSales = async () => {
    if (!session || (session.user_type !== 1 && session.user_type !== 2))
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

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = "/api/invoice/your-invoices";
        if (session && (session.user_type === 1 || session.user_type === 2)) {
          endpoint = "/api/invoice/";
        }
        const res = await fetch(endpoint);
        const data = await res.json();
        if (res.ok && data.success) {
          setInvoices(data.invoices || []);
        } else {
          setError(data.error || "Failed to fetch invoices");
        }
      } catch (err) {
        setError("Failed to fetch invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
    fetchAgentsSales();
  }, [session]);

  let sortedInvoices = [...invoices];

  // Admin filtering logic
  let filteredInvoices = sortedInvoices;
  if (session && (session.user_type === 1 || session.user_type === 2)) {
    filteredInvoices = sortedInvoices.filter((inv) => {
      let pass = true;
      if (filterAgent) {
        pass = pass && inv.agentName === filterAgent;
      }
      if (filterStatus) {
        pass = pass && inv.status === filterStatus;
      }
      if (filterDate === "today") {
        const today = new Date();
        const created = new Date(inv.createdAt);
        pass =
          pass &&
          created.getFullYear() === today.getFullYear() &&
          created.getMonth() === today.getMonth() &&
          created.getDate() === today.getDate();
      } else if (filterDate) {
        const selected = new Date(filterDate);
        const created = new Date(inv.createdAt);
        pass =
          pass &&
          created.getFullYear() === selected.getFullYear() &&
          created.getMonth() === selected.getMonth() &&
          created.getDate() === selected.getDate();
      }
      return pass;
    });
  }
  if (sortBy === "dueDate") {
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
        {/* Agents Sales Section - Only for Admin Users */}
        {session && (session.user_type === 1 || session.user_type === 2) && (
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-3">
                <Users className="text-blue-600" size={32} />
                All Agents Sales Overview
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Sales performance of all agents
              </p>
            </div>

            {agentsLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              </div>
            ) : agentsSales.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6">
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

        {session && session.user_type === 3 && (
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
              <FileText className="text-gray-400 mb-2" size={32} />
              <span className="text-gray-600 font-semibold">
                No invoices found.
              </span>
            </div>
          ) : (
            <>
              {/* Only show filteredInvoices for admin, otherwise sortedInvoices */}
              {session &&
                session.user_type === 3 && ( // chahyein tw admin ko bhi dikhadein lekin faida nahin
                  <div className="bg-blue-50 dark:bg-gray-900 rounded-xl mb-4 py-4 px-4 flex flex-col md:flex-row justify-center items-center gap-4 w-full">
                    <span className="text-2xl md:text-2xl font-bold text-blue-700 dark:text-blue-300 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                      Total: {sortedInvoices.length}
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                      Paid:{" "}
                      {
                        sortedInvoices.filter((inv) => inv.status === "paid")
                          .length
                      }
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-yellow-700 dark:text-yellow-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                      Pending:{" "}
                      {
                        sortedInvoices.filter((inv) => inv.status !== "paid")
                          .length
                      }
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-purple-700 dark:text-purple-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                      This Month Sales: $
                      {(() => {
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();
                        return sortedInvoices
                          .filter((inv) => {
                            if (inv.status !== "paid") return false;
                            const createdDate = new Date(inv.createdAt);
                            return (
                              createdDate.getMonth() === currentMonth &&
                              createdDate.getFullYear() === currentYear
                            );
                          })
                          .reduce((sum, inv) => sum + inv.totalPrice, 0)
                          .toFixed(2);
                      })()}
                    </span>
                    <span className="text-lg md:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      Total Paid Sales: $
                      {sortedInvoices
                        .filter((inv) => inv.status === "paid")
                        .reduce((sum, inv) => sum + inv.totalPrice, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                )}

              <div className="overflow-x-auto md:-mx-6">
                {session &&
                  (session.user_type === 1 || session.user_type === 2) && (
                    <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-center">
                      <select
                        value={filterAgent}
                        onChange={(e) => setFilterAgent(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm w-40"
                      >
                        <option value="">All Agents</option>
                        <option value="Faizyab Ali">Faizyab Ali</option>
                        <option value="Hussain Moiz">Hussain Moiz</option>
                        <option value="Rafey Haq">Rafey Haq</option>
                      </select>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm w-40"
                      >
                        <option value="">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                      <select
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm w-40"
                      >
                        <option value="">All Dates</option>
                        <option value="today">Today</option>
                      </select>
                      <input
                        type="date"
                        value={
                          filterDate && filterDate !== "today" ? filterDate : ""
                        }
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm w-40"
                      />
                    </div>
                  )}
                <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 rounded-sm">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer Email
                      </th>
                      {session && session.user_type === 3 ? (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created
                        </th>
                      ): 
                      (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created
                        </th>
                      )}
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
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
                      {/* <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th> */}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {(session &&
                    (session.user_type === 1 || session.user_type === 2)
                      ? filteredInvoices
                      : sortedInvoices
                    ).map((inv, idx) => (
                      <tr
                        key={inv._id}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                      >
                        {/* INDEX */}
                        <td className="px-3 py-4 font-mono text-gray-500 dark:text-gray-400 font-bold">
                          {idx + 1}
                        </td>
                        {/* INVOICE NUMBER */}
                        <td className="px-3 py-4 font-mono text-blue-700 dark:text-blue-300">
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
                        </td>
                        {/* CUSTOMER EMAIL*/}
                        <td className="px-3 py-4 text-gray-800 dark:text-gray-200 w-48">
                          <div
                            className="max-w-full truncate"
                            title={inv.customerEmail}
                          >
                            {inv.customerEmail}
                          </div>
                        </td>
                        {/* CREATED AT | AGENT NAME */}
                        { session && session.user_type === 3 ? (
                          <td className="px-3 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                           {new Date(inv.createdAt).toLocaleString()}
                          </td>
                        ) : (
                          <td className="px-3 py-3 text-left text-sm font-medium text-lime-600 dark:text-lime-300 uppercase tracking-wider whitespace-nowrap">
                            {inv.agentName}
                          </td>
                          )}
                        {/* TOTAL */}
                        <td className="px-3 py-4 font-semibold text-green-700 dark:text-green-400">
                          ${inv.totalPrice.toFixed(2)}
                        </td>
                        {/* DUE DATE */}
                        <td className="px-3 py-4 text-gray-800 dark:text-gray-200">
                          {inv.status === "paid" && inv.paidAt ? (
                            <span>
                              <span className="font-semibold text-green-600 dark:text-green-300">
                                Paid At:
                              </span>{" "}
                              <span className="text-sm ">
                                {new Date(inv.paidAt!).toLocaleDateString()}
                              </span>{" "}
                            </span>
                          ) : (
                            new Date(inv.dueDate).toLocaleDateString()
                          )}
                        </td>
                        {/* STATUS */}
                        <td className="px-3 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              inv.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : inv.status === "unpaid"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {inv.status.charAt(0).toUpperCase() +
                              inv.status.slice(1)}
                          </span>
                        </td>
                        {/* ACTIONS */}
                        {/* <td className="px-3 py-4 whitespace-nowrap">
                          {inv.hostedUrl && (
                            <a
                              href={inv.hostedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              View
                            </a>
                          )}
                        </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourInvoicesPage;
