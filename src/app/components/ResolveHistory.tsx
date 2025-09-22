"use client";

import React, { useState } from "react";
import { Clock, Mail, Calendar, User, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { ResolveHistoryEntry } from "@/types/companyLead";

interface ResolveHistoryProps {
    history: ResolveHistoryEntry[];
    loading?: boolean;
}

export default function ResolveHistory({ history, loading = false }: ResolveHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Debug logging
    console.log("ResolveHistory - history:", history, "length:", history?.length);
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-4">
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
        <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Resolve History
                    {history && history.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {history.length}
                        </span>
                    )}
                </h3>
                {history && history.length > 1 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show All ({history.length})
                            </>
                        )}
                    </button>
                )}
            </div>

            {history && history.length > 0 ? (
                <div className="space-y-2">
                    {(isExpanded ? history : history.slice(-1)).reverse().map((entry, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded-r-lg">
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(entry.statusCategory)}`}>
                                            {entry.statusCategory}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                            {entry.resolveStatus}
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-500 flex items-center space-x-3">
                                        <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {new Date(entry.date).toLocaleDateString()}
                                        </span>
                                        {entry.by && (
                                            <span className="flex items-center">
                                                <User className="h-3 w-3 mr-1" />
                                                Agent
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-1 mx-2">
                                    {entry.emailSent && (
                                        <div className="flex items-center text-green-600" title="Email sent">
                                            <Mail className="h-3 w-3" />
                                        </div>
                                    )}
                                    {entry.followUp && (
                                        <div className="flex items-center text-blue-600" title="Follow-up scheduled">
                                            <Calendar className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {entry.notes && (
                                <div className="mt-1 flex items-start">
                                    <MessageSquare className="h-3 w-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700">{entry.notes}</p>
                                </div>
                            )}

                            {entry.followUpDate && (
                                <div className="mt-1 flex items-center text-xs text-blue-600">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Follow-up: {new Date(entry.followUpDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No status updates yet</p>
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
