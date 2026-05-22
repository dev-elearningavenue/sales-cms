"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import {
    User as UserIcon,
    Mail,
    Phone,
    FileText,
    CheckCircle2,
    XCircle,
    TrendingUp,
    TrendingDown,
    Calendar,
    Package,
    Users,
} from "lucide-react";

interface InvoiceRow {
    _id: string;
    invoiceNumber: string;
    createdAt: string;
    dueDate: string;
    agentName: string;
    siteName: string;
    totalPrice: number;
    status: string;
    hostedUrl?: string;
    paidAt?: string | null;
    products?: Array<{ name: string; quantity: number; total: number }>;
}

interface MiniInvoice {
    invoiceNumber: string;
    createdAt: string;
    agentName: string;
    totalPrice: number;
    status?: string;
}

interface Stats {
    totalInvoices: number;
    paidCount: number;
    unpaidCount: number;
    totalAmount: number;
    totalPaidAmount: number;
    totalUnpaidAmount: number;
    firstInvoice: MiniInvoice | null;
    latestInvoice: MiniInvoice | null;
    highestPaid: MiniInvoice | null;
    lowestPaid: MiniInvoice | null;
    topProduct: { name: string; totalQty: number; totalSpent: number; appearances: number } | null;
    topProducts: Array<{ name: string; totalQty: number; totalSpent: number; appearances: number }>;
    agentBreakdown: Array<{ name: string; count: number; total: number; paid: number }>;
}

interface ApiResponse {
    success: boolean;
    identity: { email: string; contactNo: string; fullName: string };
    stats: Stats;
    invoices: InvoiceRow[];
    message?: string;
}

const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString() : "—";

const statusBadge = (s: string) => {
    const base = "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (s) {
        case "paid":
            return `${base} bg-green-100 text-green-800`;
        case "sent":
            return `${base} bg-blue-100 text-blue-800`;
        case "overdue":
            return `${base} bg-red-100 text-red-800`;
        case "cancelled":
            return `${base} bg-gray-200 text-gray-800`;
        default:
            return `${base} bg-yellow-100 text-yellow-800`;
    }
};

export default function CustomerInvoiceDetailsPage() {
    const { session, loading, showToast } = useApp();
    const searchParams = useSearchParams();

    const email = (searchParams?.get("email") || "").trim();
    const contact = (searchParams?.get("contact") || "").trim();

    const [data, setData] = useState<ApiResponse | null>(null);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        if (!session) return;
        if (!email && !contact) return;
        const run = async () => {
            try {
                setDataLoading(true);
                const params = new URLSearchParams();
                if (email) params.set("email", email);
                if (contact) params.set("contact", contact);
                const res = await fetch(`/api/invoice/customer?${params.toString()}`);
                const json: ApiResponse = await res.json();
                if (json.success) {
                    setData(json);
                } else {
                    showToast(json.message || "Failed to load customer details", "error");
                }
            } catch (err) {
                console.error("Customer details fetch failed:", err);
                showToast("Failed to load customer details", "error");
            } finally {
                setDataLoading(false);
            }
        };
        run();
    }, [session, email, contact]);

    if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;

    if (!email && !contact) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600">Provide an <code>?email=</code> or <code>?contact=</code> query parameter.</div>
            </div>
        );
    }

    const identityName = data?.identity.fullName?.trim() || "Customer";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <UserIcon className="w-7 h-7 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                    {identityName}
                                </h1>
                                <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                                    {data?.identity.email && (
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" /> {data.identity.email}
                                        </span>
                                    )}
                                    {data?.identity.contactNo && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-4 h-4" /> {data.identity.contactNo}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {dataLoading && (
                            <div className="text-sm text-gray-500 italic">Loading…</div>
                        )}
                    </div>
                </div>

                {data && data.stats.totalInvoices === 0 && !dataLoading && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-10 text-center text-gray-600 dark:text-gray-300">
                        No invoices found for this customer.
                    </div>
                )}

                {data && data.stats.totalInvoices > 0 && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard
                                icon={<FileText className="w-5 h-5" />}
                                label="Total Invoices"
                                value={data.stats.totalInvoices.toString()}
                                sub={fmtMoney(data.stats.totalAmount)}
                                tone="blue"
                            />
                            <StatCard
                                icon={<CheckCircle2 className="w-5 h-5" />}
                                label="Paid"
                                value={data.stats.paidCount.toString()}
                                sub={fmtMoney(data.stats.totalPaidAmount)}
                                tone="green"
                            />
                            <StatCard
                                icon={<XCircle className="w-5 h-5" />}
                                label="Unpaid"
                                value={data.stats.unpaidCount.toString()}
                                sub={fmtMoney(data.stats.totalUnpaidAmount)}
                                tone="yellow"
                            />
                            <StatCard
                                icon={<Calendar className="w-5 h-5" />}
                                label="First Invoice"
                                value={
                                    data.stats.firstInvoice
                                        ? new Date(data.stats.firstInvoice.createdAt).toLocaleDateString()
                                        : "—"
                                }
                                sub={
                                    data.stats.firstInvoice
                                        ? `by ${data.stats.firstInvoice.agentName}`
                                        : ""
                                }
                                tone="gray"
                            />
                            <StatCard
                                icon={<TrendingUp className="w-5 h-5" />}
                                label="Highest Paid"
                                value={
                                    data.stats.highestPaid
                                        ? fmtMoney(data.stats.highestPaid.totalPrice)
                                        : "—"
                                }
                                sub={
                                    data.stats.highestPaid
                                        ? `by ${data.stats.highestPaid.agentName}`
                                        : "No paid invoices"
                                }
                                tone="emerald"
                            />
                            <StatCard
                                icon={<TrendingDown className="w-5 h-5" />}
                                label="Lowest Paid"
                                value={
                                    data.stats.lowestPaid
                                        ? fmtMoney(data.stats.lowestPaid.totalPrice)
                                        : "—"
                                }
                                sub={
                                    data.stats.lowestPaid
                                        ? `by ${data.stats.lowestPaid.agentName}`
                                        : "No paid invoices"
                                }
                                tone="orange"
                            />
                            <StatCard
                                icon={<Package className="w-5 h-5" />}
                                label="Top Product"
                                value={data.stats.topProduct?.name || "—"}
                                sub={
                                    data.stats.topProduct
                                        ? `${data.stats.topProduct.totalQty} qty · ${fmtMoney(data.stats.topProduct.totalSpent)}`
                                        : ""
                                }
                                tone="purple"
                            />
                            <StatCard
                                icon={<Users className="w-5 h-5" />}
                                label="Agents Involved"
                                value={data.stats.agentBreakdown.length.toString()}
                                sub={
                                    data.stats.agentBreakdown[0]
                                        ? `Top: ${data.stats.agentBreakdown[0].name} (${data.stats.agentBreakdown[0].count})`
                                        : ""
                                }
                                tone="indigo"
                            />
                        </div>

                        {/* Top products + Agent breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5" /> Top Products
                                </h3>
                                {data.stats.topProducts.length === 0 ? (
                                    <p className="text-sm text-gray-500">No product data</p>
                                ) : (
                                    <table className="min-w-full text-sm">
                                        <thead className="text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="text-left py-2">Product</th>
                                                <th className="text-right py-2">Qty</th>
                                                <th className="text-right py-2">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.stats.topProducts.map((p) => (
                                                <tr key={p.name} className="border-b border-gray-100 dark:border-gray-700/50">
                                                    <td className="py-2 text-gray-800 dark:text-gray-200">{p.name}</td>
                                                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{p.totalQty}</td>
                                                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{fmtMoney(p.totalSpent)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Agents
                                </h3>
                                {data.stats.agentBreakdown.length === 0 ? (
                                    <p className="text-sm text-gray-500">No agent data</p>
                                ) : (
                                    <table className="min-w-full text-sm">
                                        <thead className="text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="text-left py-2">Agent</th>
                                                <th className="text-right py-2">Invoices</th>
                                                <th className="text-right py-2">Paid</th>
                                                <th className="text-right py-2">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.stats.agentBreakdown.map((a) => (
                                                <tr key={a.name} className="border-b border-gray-100 dark:border-gray-700/50">
                                                    <td className="py-2 text-gray-800 dark:text-gray-200">{a.name}</td>
                                                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{a.count}</td>
                                                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{a.paid}</td>
                                                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{fmtMoney(a.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* All invoices */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    All Invoices ({data.invoices.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/40">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice #</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Site</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paid At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.invoices.map((inv) => (
                                            <tr key={inv._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                                    {fmtDate(inv.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-blue-700 dark:text-blue-300">
                                                    {inv.hostedUrl ? (
                                                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                                            {inv.invoiceNumber}
                                                        </a>
                                                    ) : (
                                                        inv.invoiceNumber
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{inv.siteName}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{inv.agentName}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">{inv.dueDate}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-100 font-semibold">
                                                    {fmtMoney(inv.totalPrice)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={statusBadge(inv.status)}>
                                                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {fmtDate(inv.paidAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    tone: "blue" | "green" | "yellow" | "gray" | "emerald" | "orange" | "purple" | "indigo";
}

const toneStyles: Record<StatCardProps["tone"], string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function StatCard({ icon, label, value, sub, tone }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${toneStyles[tone]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={value}>{value}</p>
                {sub && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={sub}>{sub}</p>
                )}
            </div>
        </div>
    );
}
