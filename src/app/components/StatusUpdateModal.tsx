"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { StatusCategory, getModalConfigForCategory, getActionForResolveStatus } from "@/constants/statusHierarchy";
import { StatusUpdateData } from "@/types/companyLead";
import { ICompanyLead } from "@/models/companyLead";
import { getDomainEmail, domainShortCodes } from "@/utils/helper";
import dynamic from "next/dynamic";

const CKEditorWrapper = dynamic(() => import("@/app/components/CKEditorWrapper"), {
    ssr: false,
    loading: () => <div className="p-4 border rounded">Loading editor...</div>
});

interface StatusUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: StatusUpdateData) => void;
    category: StatusCategory;
    resolveStatus: string;
    currentLead: ICompanyLead | null;
    session: any;
    loading?: boolean;
}

export default function StatusUpdateModal({
    isOpen,
    onClose,
    onSubmit,
    category,
    resolveStatus,
    currentLead,
    session,
    loading = false
}: StatusUpdateModalProps) {
    const [formData, setFormData] = useState<StatusUpdateData>({
        statusCategory: category,
        resolveStatus: resolveStatus,
        notes: "",
        followUp: false,
        followUpDate: undefined,
        emailData: {
            from: "",
            to: "",
            subject: "",
            body: "",
            send: false
        }
    });

    const modalConfig = getModalConfigForCategory(category);
    const actionDescription = getActionForResolveStatus(category, resolveStatus);

    // Initialize form data when modal opens
    useEffect(() => {
        if (isOpen && currentLead) {
            // Get domain email from user's assignedDomain
            const domain = domainShortCodes[session?.assignedDomain];
            const domainEmail = domain ? getDomainEmail(domain) : "";

            setFormData({
                statusCategory: category,
                resolveStatus: resolveStatus,
                notes: "",
                followUp: false,
                followUpDate: undefined,
                emailData: {
                    from: domainEmail || "",
                    to: currentLead.companyEmail || "",
                    subject: `Regarding ${currentLead.companyName} - ${resolveStatus}`,
                    body: "",
                    send: false
                }
            });
        }
    }, [isOpen, category, resolveStatus, currentLead, session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    const handleInputChange = (field: keyof StatusUpdateData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEmailDataChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            emailData: {
                ...prev.emailData!,
                [field]: value
            }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Update Status: {category}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {resolveStatus} • {actionDescription}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Notes Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes {modalConfig.showNotes ? "*" : ""}
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange("notes", e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Add your notes about this status update..."
                                required={modalConfig.showNotes}
                            />
                        </div>

                        {/* Follow-up Section */}
                        {modalConfig.showFollowUp && (
                            <div className="border-t pt-6">
                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        id="followUp"
                                        checked={formData.followUp}
                                        onChange={(e) => handleInputChange("followUp", e.target.checked)}
                                        className="mr-2"
                                    />
                                    <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
                                        Schedule Follow-up
                                    </label>
                                </div>

                                {formData.followUp && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Follow-up Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.followUpDate ? formData.followUpDate.toISOString().split('T')[0] : ""}
                                            onChange={(e) => handleInputChange("followUpDate", e.target.value ? new Date(e.target.value) : undefined)}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Email Section */}
                        {modalConfig.showEmail && (
                            <div className="border-t pt-6">
                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        id="sendEmail"
                                        checked={formData.emailData?.send || false}
                                        onChange={(e) => handleEmailDataChange("send", e.target.checked)}
                                        className="mr-2"
                                    />
                                    <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700">
                                        Send Email {modalConfig.requireEmail ? "*" : ""}
                                    </label>
                                </div>

                                {formData.emailData?.send && (
                                    <div className="space-y-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    From
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.emailData.from}
                                                    onChange={(e) => handleEmailDataChange("from", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="sender@domain.com"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    To
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.emailData.to}
                                                    onChange={(e) => handleEmailDataChange("to", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="recipient@company.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Subject
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.emailData.subject}
                                                onChange={(e) => handleEmailDataChange("subject", e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Email subject"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Body
                                            </label>
                                            <div className="text-black">
                                                <CKEditorWrapper
                                                    value={formData.emailData.body}
                                                    onChange={(data) => handleEmailDataChange("body", data)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Updating..." : "Update Status"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
