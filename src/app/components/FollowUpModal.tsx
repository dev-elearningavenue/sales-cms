"use client";

import React, { useState, useEffect } from "react";
import { domainShortCodes, getDomainEmail } from "@/utils/helper";
import dynamic from "next/dynamic";

const CKEditorWrapper = dynamic(() => import("@/app/components/CKEditorWrapper"), {
    ssr: false,
    loading: () => <div className="p-4 border rounded">Loading editor...</div>
});

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FollowUpData) => Promise<void>;
    currentLead: any;
    session: any;
    loading?: boolean;
}

interface FollowUpData {
    nextFollowUpDate: string;
    contactTypes: string[];
    followUpNotes: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    emailFrom: string;
    emailTo: string;
    emailSubject: string;
    emailBody: string;
}

export default function FollowUpModal({
    isOpen,
    onClose,
    onSubmit,
    currentLead,
    session,
    loading = false
}: FollowUpModalProps) {
    const [formData, setFormData] = useState<FollowUpData>({
        nextFollowUpDate: "",
        contactTypes: ["email"],
        followUpNotes: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        emailFrom: "",
        emailTo: "",
        emailSubject: "",
        emailBody: ""
    });

    // Initialize form data when modal opens
    useEffect(() => {
        if (isOpen && currentLead) {
            setFormData({
                nextFollowUpDate: "",
                contactTypes: ["email"],
                followUpNotes: "",
                contactPerson: "",
                contactEmail: "",
                contactPhone: "",
                emailFrom: "",
                emailTo: currentLead.companyEmail || "",
                emailSubject: "",
                emailBody: ""
            });

            // Get domain email from user's assignedDomain
            const domain = domainShortCodes[(session as any)?.assignedDomain];
            if (domain) {
                const domainConfig = getDomainEmail(domain);
                setFormData(prev => ({ ...prev, emailFrom: domainConfig || "" }));
            }
        }
    }, [isOpen, currentLead, session]);

    const toggleContactType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            contactTypes: prev.contactTypes.includes(type)
                ? prev.contactTypes.filter(t => t !== type)
                : [...prev.contactTypes, type]
        }));
    };

    const handleSubmit = async () => {
        await onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Follow Up & Send Email</h2>

                {/* Status and Follow-up Date */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Next Follow-up Date</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2"
                            value={formData.nextFollowUpDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, nextFollowUpDate: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Contact Types */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Contact Method</label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formData.contactTypes.includes("email")}
                                disabled
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="text-gray-600">Email</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formData.contactTypes.includes("call")}
                                onChange={() => toggleContactType("call")}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            Call
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formData.contactTypes.includes("chat")}
                                onChange={() => toggleContactType("chat")}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            Chat
                        </label>
                    </div>
                </div>

                {/* Follow-up Notes */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Follow-up Notes</label>
                    <textarea
                        className="w-full border rounded px-3 py-2"
                        rows={2}
                        placeholder="Add details about the follow up"
                        value={formData.followUpNotes}
                        onChange={(e) => setFormData(prev => ({ ...prev, followUpNotes: e.target.value }))}
                    />
                </div>

                {/* Email Section */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-3">Email Details (Optional)</h3>

                    {/* From and To Fields */}
                    <div className="mb-3 flex flex-row gap-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                From:
                            </label>
                            <input
                                type="email"
                                value={formData.emailFrom}
                                disabled
                                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                                placeholder="Domain email will appear here"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                To:
                            </label>
                            <input
                                type="email"
                                value={formData.emailTo}
                                onChange={(e) => setFormData(prev => ({ ...prev, emailTo: e.target.value }))}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                                placeholder="Lead email address"
                            />
                        </div>
                    </div>

                    {/* Subject Field */}
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject:
                        </label>
                        <input
                            type="text"
                            value={formData.emailSubject}
                            onChange={(e) => setFormData(prev => ({ ...prev, emailSubject: e.target.value }))}
                            className="w-full p-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Email subject"
                        />
                    </div>

                    {/* Email Body with CKEditor */}
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Message:
                        </label>
                        <div className="text-gray-700">
                            <CKEditorWrapper
                                value={formData.emailBody}
                                onChange={(data: string) => setFormData(prev => ({ ...prev, emailBody: data }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                        disabled={loading || !formData.nextFollowUpDate}
                    >
                        {loading ? "Processing..." : "Update Status & Send Email"}
                    </button>
                </div>
            </div>
        </div>
    );
}
