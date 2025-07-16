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

  // Fetch real-time status for each invoice after invoices are loaded
  useEffect(() => {
    if (invoices.length === 0) return;
    const fetchStatuses = async () => {
      const newStatusMap: {
        [id: string]: { status: string; paidAt?: string };
      } = {};
      await Promise.all(
        invoices.map(async (inv) => {
          try {
            const params = new URLSearchParams({
              customer_id: inv.customerId || "",
              invoice_number: inv.invoiceNumber,
              site_name: inv.siteName || "OSHA OUTREACH COURSES",
            });
            if ((inv as any).customerId)
              params.set("customer_id", (inv as any).customerId);
            if (inv.siteName) params.set("site_name", inv.siteName);
            const url = `https://freeoshacourses.com/api/fetch_invoice_status.php?${params.toString()}`;
            const res = await fetch(url);
            const data = await res.json();
            // New API: status and paidAt inside data
            if (
              data.status &&
              data.data &&
              (data.data.status === "paid" || data.data.status === "unpaid")
            ) {
              newStatusMap[inv._id] = {
                status: data.data.status,
                paidAt: data.data.paidAt || undefined,
              };
            }
            //  else if (
            //   data.status &&
            //   (data.status === "paid" || data.status === "unpaid")
            // ) {
            //   // fallback for previous API
            //   newStatusMap[inv._id] = {
            //     status: data.status,
            //     paidAt: data.paidAt || undefined,
            //   };
            // } else if (data.status && data.data && data.data.status) {
            //   // fallback for very old API
            //   newStatusMap[inv._id] = {
            //     status: data.data.status,
            //   };
            // }
          } catch (e) {
            // fallback: do not override
          }
        })
      );
      setStatusMap(newStatusMap);
    };
    fetchStatuses();
  }, [invoices]);

  // Sorting logic
  let sortedInvoices = [...invoices];
  if (sortBy === "dueDate") {
    sortedInvoices.sort((a, b) => {
      const aDate =
        statusMap[a._id]?.status === "paid" && statusMap[a._id]?.paidAt
          ? new Date(statusMap[a._id].paidAt!)
          : new Date(a.dueDate);
      const bDate =
        statusMap[b._id]?.status === "paid" && statusMap[b._id]?.paidAt
          ? new Date(statusMap[b._id].paidAt!)
          : new Date(b.dueDate);
      return sortOrder === "asc"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    });
  } else if (sortBy === "status") {
    sortedInvoices.sort((a, b) => {
      const aStatus = (
        statusMap[a._id]?.status ||
        a.status ||
        ""
      ).toLowerCase();
      const bStatus = (
        statusMap[b._id]?.status ||
        b.status ||
        ""
      ).toLowerCase();
      if (aStatus === bStatus) return 0;
      if (sortOrder === "asc") return aStatus > bStatus ? 1 : -1;
      return aStatus < bStatus ? 1 : -1;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2">
            Your Invoices
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            View all invoices you have created
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {/* Summary Row */}
                <thead>
                  <tr>
                    <th
                      colSpan={8}
                      className="px-6 py-4 text-left text-lg font-bold bg-blue-50 dark:bg-gray-900 text-blue-700 dark:text-blue-300 rounded-t-xl"
                      style={{
                        borderTopLeftRadius: "0.75rem",
                        borderTopRightRadius: "0.75rem",
                      }}
                    >
                      <span className="mr-8">Total: {invoices.length}</span>
                      <span className="text-green-700 dark:text-green-400 mr-8">
                        Paid:{" "}
                        {
                          invoices.filter(
                            (inv) =>
                              (statusMap[inv._id]?.status ?? inv.status) ===
                              "paid"
                          ).length
                        }
                      </span>
                      <span className="text-yellow-700 dark:text-yellow-400">
                        Pending:{" "}
                        {
                          invoices.filter(
                            (inv) =>
                              (statusMap[inv._id]?.status ?? inv.status) !==
                              "paid"
                          ).length
                        }
                      </span>
                    </th>
                  </tr>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Total
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Created
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {sortedInvoices.map((inv, idx) => (
                    <tr
                      key={inv._id}
                      className="hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-mono text-blue-700 dark:text-blue-300 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {inv.customerEmail}
                      </td>
                      <td className="px-6 py-4 font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
                        ${inv.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {statusMap[inv._id]?.status === "paid" &&
                        statusMap[inv._id]?.paidAt ? (
                          <span>
                            <span className="font-semibold text-green-600 dark:text-green-300">
                              Paid At:
                            </span>{" "}
                            {new Date(
                              statusMap[inv._id].paidAt!
                            ).toLocaleString()}
                          </span>
                        ) : (
                          new Date(inv.dueDate).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            (statusMap[inv._id]?.status ||
                              inv.status ||
                              inv.status) === "paid"
                              ? "bg-green-100 text-green-700"
                              : (statusMap[inv._id]?.status ||
                                  inv.status ||
                                  inv.status) === "unpaid"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {(
                            statusMap[inv._id]?.status ||
                            inv.status ||
                            inv.status
                          )
                            .charAt(0)
                            .toUpperCase() +
                            (
                              statusMap[inv._id]?.status ||
                              inv.status ||
                              inv.status
                            ).slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourInvoicesPage;
