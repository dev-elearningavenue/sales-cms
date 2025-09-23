"use client";

import React, { useState } from "react";
import { Mail, Clock, User, ChevronDown, ChevronUp } from "lucide-react";

interface EmailHistoryProps {
    emails: any[];
    loading?: boolean;
}

export default function EmailHistory({ emails, loading = false }: EmailHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Email History
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
                    <Mail className="h-5 w-5 mr-2" />
                    Email History
                    {emails && emails.length > 0 && (
                        <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                            {emails.length}
                        </span>
                    )}
                </h3>
                {emails && emails.length > 1 && (
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
                                Show All ({emails.length})
                            </>
                        )}
                    </button>
                )}
            </div>

            {emails && emails.length > 0 ? (
                <div className="space-y-2">
                    {(isExpanded ? emails : emails.slice(-1)).reverse().map((email: any, index: number) => (
                        <div key={index} className="border-l-4 border-purple-500 pl-3 pr-2 py-2 bg-purple-50 rounded-r-lg">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 flex-1 mr-2">
                                    {email.subject}
                                </span>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                    {new Date(email.sentAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="text-xs text-gray-600 mb-1">
                                <span className="font-medium">To:</span> {email.to}
                            </div>

                            {email.body && (
                                <div className="text-xs text-gray-600">
                                    <div dangerouslySetInnerHTML={{ __html: email.body.substring(0, 100) + (email.body.length > 100 ? '...' : '') }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No email history available</p>
                </div>
            )}
        </div>
    );
}
