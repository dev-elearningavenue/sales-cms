"use client";

import React from "react";
import { Clock, Mail, Calendar, User, MessageSquare } from "lucide-react";
import { ResolveHistoryEntry } from "@/types/companyLead";

interface ResolveHistoryProps {
    history: ResolveHistoryEntry[];
    loading?: boolean;
}

export default function ResolveHistory({ history, loading = false }: ResolveHistoryProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Resolve History
                </h3>
                <div className="animate-pulse">
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border-l-4 border-gray-200 pl-4 py-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Resolve History
            </h3>

            {history && history.length > 0 ? (
                <div className="space-y-4">
                    {history.slice().reverse().map((entry, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(entry.statusCategory)}`}>
                                            {entry.statusCategory}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {entry.resolveStatus}
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-500 flex items-center space-x-4">
                                        <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {new Date(entry.date).toLocaleString()}
                                        </span>
                                        {entry.by && (
                                            <span className="flex items-center">
                                                <User className="h-3 w-3 mr-1" />
                                                Agent
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    {entry.emailSent && (
                                        <div className="flex items-center text-green-600" title="Email sent">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                    )}
                                    {entry.followUp && (
                                        <div className="flex items-center text-blue-600" title="Follow-up scheduled">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {entry.notes && (
                                <div className="mt-2 flex items-start">
                                    <MessageSquare className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{entry.notes}</p>
                                </div>
                            )}

                            {entry.followUpDate && (
                                <div className="mt-2 flex items-center text-sm text-blue-600">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Follow-up: {new Date(entry.followUpDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No status updates yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                        Status changes will appear here once you start updating the lead
                    </p>
                </div>
            )}
        </div>
    );
}

// Helper function to get color classes for status categories
function getCategoryColor(category: string) {
    switch (category) {
        case "Interested":
            return "bg-green-100 text-green-800";
        case "Invalid Contact":
            return "bg-red-100 text-red-800";
        case "Delayed Interest":
            return "bg-yellow-100 text-yellow-800";
        case "Rejection":
            return "bg-gray-100 text-gray-800";
        default:
            return "bg-blue-100 text-blue-800";
    }
}
