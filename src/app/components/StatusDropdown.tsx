"use client";

import React, { useState } from "react";
import { StatusCategory, RESOLVE_STATUSES, STATUS_CATEGORIES } from "@/constants/statusHierarchy";
import { ChevronDown } from "lucide-react";

interface StatusDropdownProps {
    onStatusSelect: (category: StatusCategory, resolveStatus: string) => void;
    disabled?: boolean;
    currentCategory?: StatusCategory;
    currentResolveStatus?: string;
}

export default function StatusDropdown({
    onStatusSelect,
    disabled = false,
    currentCategory,
    currentResolveStatus
}: StatusDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<StatusCategory | null>(currentCategory || null);

    const handleCategorySelect = (category: StatusCategory) => {
        setSelectedCategory(category);
        // Don't close yet - let user select resolve status
    };

    const handleResolveStatusSelect = (category: StatusCategory, resolveStatus: string) => {
        setSelectedCategory(null);
        setIsOpen(false);
        onStatusSelect(category, resolveStatus);
    };

    const getCurrentDisplay = () => {
        if (currentCategory && currentResolveStatus) {
            return `${currentCategory} - ${currentResolveStatus}`;
        }
        return "Select Status";
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full flex items-center justify-between px-4 py-2 text-left bg-white border border-gray-300 rounded-lg
          ${disabled
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    }
        `}
            >
                <span className="text-sm font-medium">{getCurrentDisplay()}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {!selectedCategory ? (
                        // Step 1: Show Categories
                        <div className="p-2">
                            <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                                Select Category
                            </div>
                            {Object.entries(STATUS_CATEGORIES).map(([category, label]) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategorySelect(category as StatusCategory)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md flex items-center justify-between"
                                >
                                    <span className="font-medium">{label}</span>
                                    <span className="text-xs text-gray-500">
                                        {RESOLVE_STATUSES[category as StatusCategory].length} options
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Step 2: Show Resolve Statuses for selected category
                        <div className="p-2">
                            <div className="flex items-center justify-between px-2 py-1 mb-2 border-b">
                                <span className="text-xs font-semibold text-gray-500">
                                    {selectedCategory}
                                </span>
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    <svg
                                        className="h-4 w-4 mr-1"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                            </div>
                            {RESOLVE_STATUSES[selectedCategory].map((resolveStatus) => (
                                <button
                                    key={resolveStatus}
                                    onClick={() => handleResolveStatusSelect(selectedCategory, resolveStatus)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md"
                                >
                                    {resolveStatus}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isOpen && !disabled && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setIsOpen(false);
                        setSelectedCategory(null);
                    }}
                />
            )}
        </div>
    );
}
