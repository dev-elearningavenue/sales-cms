import React from "react";
import { CompanyLeadStats as Stats } from "@/types/companyLead";

interface CompanyLeadStatsProps {
    stats: Stats;
}

const CompanyLeadStats: React.FC<CompanyLeadStatsProps> = ({ stats }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-gray-500";
            case "processing":
                return "bg-blue-500";
            case "resolved":
                return "bg-green-500";
            case "closed":
                return "bg-red-500";
            case "followUp":
                return "bg-yellow-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Statistics</h2>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Leads</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Pending</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Processing</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.processing}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Follow Up</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.followUp}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Resolved</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.resolved}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Closed</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.closed}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top States and Domains */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top States */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top States</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.byState)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([state, count]) => (
                                <div key={state} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{state}</span>
                                    <span className="text-sm font-medium text-gray-900">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Top Domains */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">By Domain</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.byDomain)
                            .sort(([, a], [, b]) => b - a)
                            .map(([domain, count]) => (
                                <div key={domain} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{domain}</span>
                                    <span className="text-sm font-medium text-gray-900">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Status Categories */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">By Category</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.byCategory)
                            .sort(([, a], [, b]) => b - a)
                            .map(([category, count]) => (
                                <div key={category} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{category}</span>
                                    <span className="text-sm font-medium text-gray-900">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyLeadStats;
