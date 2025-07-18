"use client";
import React, { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerEmail: string;
  totalPrice: number;
  dueDate: string;
  status: string;
  hostedUrl?: string;
  createdAt: string;
  siteName?: string;
  customerId?: string;
  invoice_status?: string;
  paidAt?: string;
}

const YourInvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sortBy, setSortBy] = useState<"dueDate" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // statusMap: { [id]: { invoice_status: string, paidAt?: string } }
  const [statusMap, setStatusMap] = useState<{
    [id: string]: { status: string; paidAt?: string };
  }>({});

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/invoice/your-invoices");
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
  }, []);

  let sortedInvoices = [...invoices];
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
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2">
            Your Invoices
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            View all invoices you have created
          </p>
        </div>
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
              <div className="bg-blue-50 dark:bg-gray-900 rounded-xl mb-4 py-4 px-4 flex flex-col md:flex-row justify-center items-center gap-4 w-full">
                <span className="text-2xl md:text-2xl font-bold text-blue-700 dark:text-blue-300 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                  Total: {sortedInvoices.length}
                </span>
                <span className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                  Paid:{" "}
                  {sortedInvoices.filter((inv) => inv.status === "paid").length}
                </span>
                <span className="text-xl md:text-2xl font-bold text-yellow-700 dark:text-yellow-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                  Pending:{" "}
                  {sortedInvoices.filter((inv) => inv.status !== "paid").length}
                </span>
                <span className="text-xl md:text-2xl font-bold text-purple-700 dark:text-purple-400 md:border-r md:border-gray-300 dark:md:border-gray-600 md:pr-6">
                  This Month Sales: $
                  {(() => {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    return sortedInvoices
                      .filter((inv) => {
                        if (inv.status !== "paid" || !inv.paidAt) return false;
                        const paidDate = new Date(inv.paidAt);
                        return (
                          paidDate.getMonth() === currentMonth &&
                          paidDate.getFullYear() === currentYear
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

              <div className="overflow-x-auto md:-mx-6">
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
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
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
                        Created
                      </th>
                      {/* <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th> */}
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
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {new Date(inv.createdAt).toLocaleString()}
                        </td>
                        {/* ACTIONS */}
                        {/* <td className="px-6 py-4 whitespace-nowrap">
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
