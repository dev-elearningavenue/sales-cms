"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IManagerLead } from "@/types/managerLead";
import { useApp } from "@/contexts/AppContext";
import StatusDropdown from "@/app/components/StatusDropdown";
import StatusUpdateModal from "@/app/components/StatusUpdateModal";
import { StatusCategory, StatusUpdateData } from "@/types/companyLead";
import { Eye } from "lucide-react";

interface UploadModalState {
    open: boolean;
}

export default function ManagerLeadsPage() {
    const { session, loading, showToast } = useApp();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [currentLead, setCurrentLead] = useState<IManagerLead | null>(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [assignedLeadsCount, setAssignedLeadsCount] = useState({
        total: 0,
        today: 0,
        week: 0,
        month: 0,
        byDomain: {} as Record<string, number>,
        quota: { daily: 30, current: 0 },
    });

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadSource, setUploadSource] = useState("");
    const [uploadError, setUploadError] = useState("");

    const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<StatusCategory | null>(null);
    const [selectedResolveStatus, setSelectedResolveStatus] = useState("");

    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [companyAccountLoading, setCompanyAccountLoading] = useState(false);
    const [companyProgress, setCompanyProgress] = useState<string[]>([]);
    const companyPollRef = useRef(0);
    const [leadFields, setLeadFields] = useState({
        companyEmail: "",
        contactNo: "",
        firstName: "",
        lastName: "",
        notes: "",
    });

    const fetchAssignedLeadsCount = async () => {
        try {
            const response = await fetch("/api/manager-leads/assigned-count");
            const result = await response.json();
            if (result.success) setAssignedLeadsCount(result.data);
        } catch (error) {
            console.error("Error fetching assigned manager-leads count:", error);
        }
    };

    useEffect(() => {
        if (session) fetchAssignedLeadsCount();
    }, [session]);

    useEffect(() => {
        const leadId = searchParams?.get("ml");
        if (leadId && !currentLead) loadLeadById(leadId);
    }, [searchParams, currentLead]);

    const populateFields = (lead: IManagerLead) => {
        setLeadFields({
            companyEmail: lead.companyEmail || "",
            contactNo: lead.contactNo || "",
            firstName: lead.firstName || "",
            lastName: lead.lastName || "",
            notes: lead.notes || "",
        });
    };

    const loadLeadById = async (leadId: string) => {
        try {
            setDataLoading(true);
            const response = await fetch(`/api/manager-leads/${leadId}`);
            const result = await response.json();
            if (result.success) {
                setCurrentLead(result.lead);
                populateFields(result.lead);
                showToast("Lead loaded successfully!", "success");
            } else {
                showToast("Lead not found", "error");
                router.replace("/manager-leads");
            }
        } catch (error) {
            console.error("Error loading manager lead:", error);
            showToast("Error loading lead", "error");
            router.replace("/manager-leads");
        } finally {
            setDataLoading(false);
        }
    };

    const handleSaveLeadFields = async () => {
        if (!currentLead) return;
        try {
            setFieldsLoading(true);
            const response = await fetch(`/api/manager-leads/${currentLead._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leadFields),
            });
            const result = await response.json();
            if (result.success) {
                setCurrentLead(result.lead);
                showToast("Lead details updated successfully!", "success");
            } else {
                showToast(result.message || "Failed to update lead", "error");
            }
        } catch (error) {
            console.error("Save manager lead fields error:", error);
            showToast("Failed to save lead details. Please try again.", "error");
        } finally {
            setFieldsLoading(false);
        }
    };

    const handleCreateCompanyAccount = async () => {
        if (!currentLead || companyAccountLoading) return;
        const company = String(currentLead.companyName || "").trim();
        const firstName = leadFields.firstName.trim();
        const lastName = leadFields.lastName.trim();
        const email = leadFields.companyEmail.trim();
        if (!company || !firstName || !lastName || !email) {
            showToast("Company, first name, last name, and email are required.", "error");
            return;
        }

        const leadId = currentLead._id;
        const pollId = companyPollRef.current + 1;
        companyPollRef.current = pollId;
        setCompanyAccountLoading(true);
        setCompanyProgress(["Starting manager account..."]);

        const stopWithError = (message: string) => {
            if (pollId !== companyPollRef.current) return;
            setCompanyAccountLoading(false);
            setCompanyProgress([]);
            showToast(message, "error");
        };

        try {
            const response = await fetch(
                `/api/manager-leads/${leadId}/create-company-account`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ company, firstName, lastName, email }),
                }
            );
            const result = await response.json();
            if (result.lead && result.done) {
                setCurrentLead(result.lead);
                setCompanyAccountLoading(false);
                setCompanyProgress([]);
                return;
            }
            if (!response.ok || result.success === false || !result.jobId) {
                stopWithError(result.message || result.error || "Manager account creation failed");
                return;
            }

            const poll = async () => {
                if (pollId !== companyPollRef.current) return;
                try {
                    const statusRes = await fetch(
                        `/api/manager-leads/${leadId}/create-company-account?jobId=${encodeURIComponent(result.jobId)}`
                    );
                    const status = await statusRes.json();
                    if (pollId !== companyPollRef.current) return;
                    if (Array.isArray(status.logs) && status.logs.length) {
                        setCompanyProgress(status.logs.slice(-8));
                    }
                    if (status.done && status.lead) {
                        setCurrentLead(status.lead);
                        setCompanyAccountLoading(false);
                        setCompanyProgress([]);
                        showToast("Manager account created.", "success");
                        return;
                    }
                    if (status.done && status.status === "error") {
                        stopWithError(status.message || "Manager account creation failed");
                        return;
                    }
                    window.setTimeout(poll, 2000);
                } catch (error) {
                    console.error("Manager account progress error:", error);
                    stopWithError("Could not read manager account progress.");
                }
            };
            window.setTimeout(poll, 1500);
        } catch (error) {
            console.error("Create company account error:", error);
            stopWithError("Could not reach company account automation.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) {
            setUploadFile(null);
            return;
        }
        const allowedExt = [".csv", ".xlsx", ".xls"];
        if (allowedExt.some(ext => f.name.toLowerCase().endsWith(ext))) {
            setUploadFile(f);
            setUploadError("");
        } else {
            setUploadError("Please select a valid CSV or Excel file (.csv, .xlsx, .xls)");
            setUploadFile(null);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) {
            setUploadError("Please select a file");
            return;
        }
        try {
            setDataLoading(true);
            setUploadError("");
            const formData = new FormData();
            formData.append("file", uploadFile);
            if (uploadSource) formData.append("source", uploadSource);

            const response = await fetch("/api/manager-leads", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message || "CSV uploaded successfully!", "success");
                setUploadModalOpen(false);
                setUploadFile(null);
                setUploadSource("");
            } else {
                showToast(`Upload failed: ${result.message}`, "error");
            }
        } catch (error) {
            console.error("Upload error:", error);
            showToast("Upload failed. Please try again.", "error");
        } finally {
            setDataLoading(false);
        }
    };

    const handleGetLead = async () => {
        if (currentLead && currentLead.status === "pending") {
            showToast("Please update the status of the current lead first", "info");
            return;
        }
        try {
            setDataLoading(true);
            const response = await fetch("/api/manager-leads");
            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                populateFields(result.lead);

                const leadId = result.lead._id || result.lead.id;
                if (leadId) router.replace(`/manager-leads?ml=${leadId}`);

                setAssignedLeadsCount(prev => ({
                    ...prev,
                    total: prev.total + 1,
                    today: prev.today + 1,
                    week: prev.week + 1,
                    month: prev.month + 1,
                    quota: { ...prev.quota, current: prev.quota.current + 1 },
                }));

                const fullName = [result.lead.firstName, result.lead.lastName].filter(Boolean).join(" ");
                showToast(`Found lead: ${result.lead.companyName}${fullName ? ` (${fullName})` : ""}`, "success");
            } else {
                showToast(result.message, "error");
            }
        } catch (error) {
            console.error("Get manager lead error:", error);
            showToast("Failed to get lead. Please try again.", "error");
        } finally {
            setDataLoading(false);
        }
    };

    const handleStatusSelect = (category: StatusCategory, resolveStatus: string) => {
        setSelectedCategory(category);
        setSelectedResolveStatus(resolveStatus);
        setStatusUpdateModalOpen(true);
    };

    const handleStatusUpdate = async (data: StatusUpdateData) => {
        if (!currentLead) return;
        try {
            setDataLoading(true);
            const response = await fetch(`/api/manager-leads/${currentLead._id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (result.success) {
                setCurrentLead(result.lead);
                setStatusUpdateModalOpen(false);
                showToast("Lead status updated successfully!", "success");
                if (result.emailResult && !result.emailResult.success) {
                    showToast("Status updated but email failed to send", "info");
                }
            } else {
                showToast(result.message || "Failed to update lead status", "error");
            }
        } catch (error) {
            console.error("Status update error:", error);
            showToast("Error updating lead status", "error");
        } finally {
            setDataLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!session) {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl xl:max-w-7xl px-3 sm:px-4 lg:px-4 py-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Manager Leads</h1>
                            <p className="text-gray-600 text-lg mb-4">
                                Upload manager contact data and reach out to executives directly
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="text-sm text-blue-800">
                                            <span className="font-medium">Assigned Domain:</span>
                                            <span className="ml-2 font-semibold text-blue-900">
                                                {(session as any)?.assignedDomain || "Not Assigned"}
                                            </span>
                                            {currentLead && (
                                                <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${currentLead.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                                    currentLead.status === "processing" ? "bg-blue-100 text-blue-800" :
                                                        currentLead.status === "resolved" ? "bg-green-100 text-green-800" :
                                                            currentLead.status === "closed" ? "bg-red-100 text-red-800" :
                                                                currentLead.status === "follow_up" ? "bg-purple-100 text-purple-800" :
                                                                    "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {currentLead.status === "follow_up" ? "Follow Up" :
                                                        currentLead.status.charAt(0).toUpperCase() + currentLead.status.slice(1)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{assignedLeadsCount.total}</div>
                                            <div className="text-xs text-gray-600">Total Assigned</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-blue-600">
                                                {assignedLeadsCount.quota.current}/{assignedLeadsCount.quota.daily}
                                            </div>
                                            <div className="text-xs text-gray-600">Daily Quota</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-purple-600">{assignedLeadsCount.week}</div>
                                            <div className="text-xs text-gray-600">This Week</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-orange-600">{assignedLeadsCount.month}</div>
                                            <div className="text-xs text-gray-600">This Month</div>
                                        </div>
                                        <div className="flex flex-row flex-wrap items-center text-center">
                                            <button
                                                onClick={() => router.push("/my-assigned-manager-leads")}
                                                className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-w-[120px]"
                                            >
                                                <Eye size={20} className="mr-1" />
                                                View All
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mb-4 w-full lg:w-auto lg:flex-shrink-0">
                            <div className="flex flex-wrap gap-3 lg:space-x-4">
                                {session?.user_type !== 3 && (
                                    <button
                                        onClick={() => setUploadModalOpen(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap min-w-[140px]"
                                    >
                                        📁 Upload CSV
                                    </button>
                                )}
                                <button
                                    onClick={handleGetLead}
                                    disabled={dataLoading || currentLead?.status === "pending"}
                                    className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap min-w-[140px] ${currentLead?.status === "pending"
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                        }`}
                                >
                                    {dataLoading ? "⏳ Loading..." :
                                        currentLead?.status === "pending" ?
                                            "⚠️ Update Status First" : "📞 Get Lead"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Lead */}
                {currentLead && (
                    <div className="manager-lead-wrapper bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{currentLead.companyName}</h2>
                                <p className="text-md text-gray-700 mt-1">
                                    👤 {[currentLead.firstName, currentLead.lastName].filter(Boolean).join(" ") || "Unknown contact"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    <span className="font-medium">📧 {currentLead.companyEmail || "No email"}</span> |
                                    <span className="font-medium ml-2">📞 {currentLead.contactNo || "No phone"}</span>
                                </p>
                                <p className="text-sm text-gray-500">Status: <span className="font-medium">{currentLead.status}</span></p>
                                {currentLead.assignedAt && (
                                    <p className="text-sm text-gray-500">Assigned: {new Date(currentLead.assignedAt).toLocaleDateString()}</p>
                                )}
                                {currentLead.managerAccountCreatedAt && (
                                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                                        <p><span className="font-medium">Username:</span> {currentLead.managerAccountUsername || currentLead.companyEmail}</p>
                                        <p><span className="font-medium">Password:</span> {currentLead.managerAccountPassword || "Apple123#"}</p>
                                        <p><span className="font-medium">Created:</span> {new Date(currentLead.managerAccountCreatedAt).toLocaleString()}</p>
                                    </div>
                                )}
                                {companyAccountLoading && companyProgress.length > 0 && (
                                    <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                                        <p className="font-medium mb-2">Creating manager account...</p>
                                        <ul className="space-y-1 max-h-36 overflow-auto">
                                            {companyProgress.map((line, index) => (
                                                <li key={`${index}-${line.slice(0, 24)}`}>{line}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center md:justify-end">
                                <div className="min-w-[200px]">
                                    <StatusDropdown
                                        onStatusSelect={handleStatusSelect}
                                        disabled={dataLoading}
                                        currentCategory={currentLead.statusCategory}
                                        currentResolveStatus={currentLead.resolveStatus}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Editable fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.firstName}
                                    onChange={(e) => setLeadFields({ ...leadFields, firstName: e.target.value })}
                                    placeholder="John"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.lastName}
                                    onChange={(e) => setLeadFields({ ...leadFields, lastName: e.target.value })}
                                    placeholder="Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.companyEmail}
                                    onChange={(e) => setLeadFields({ ...leadFields, companyEmail: e.target.value })}
                                    placeholder="manager@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact / Phone</label>
                                <input
                                    type="tel"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.contactNo}
                                    onChange={(e) => setLeadFields({ ...leadFields, contactNo: e.target.value })}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="mb-6">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                value={leadFields.notes}
                                onChange={(e) => setLeadFields({ ...leadFields, notes: e.target.value })}
                                placeholder="Add any notes about this lead..."
                            />
                        </div>

                        <div className="flex justify-end items-center gap-3 mb-6">
                            {!currentLead.managerAccountCreatedAt && !companyAccountLoading && (
                                <button
                                    onClick={handleCreateCompanyAccount}
                                    disabled={!leadFields.companyEmail.trim()}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    Create Manager Account
                                </button>
                            )}
                            <button
                                onClick={handleSaveLeadFields}
                                disabled={fieldsLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {fieldsLoading ? "💾 Saving..." : "Save All Changes"}
                            </button>
                        </div>

                        {/* Follow-up History */}
                        {Array.isArray((currentLead as any).next_follow_up) && (currentLead as any).next_follow_up.length > 0 && (
                            <div className="mt-6 border-t pt-6">
                                <h3 className="font-medium mb-3 text-gray-900">Follow-up History</h3>
                                <div className="bg-green-50 rounded-lg p-4 max-h-60 overflow-auto">
                                    <ul className="space-y-3">
                                        {(currentLead as any).next_follow_up.slice(-10).reverse().map((f: any, idx: number) => (
                                            <li key={idx} className="bg-white rounded p-3 border-l-4 border-green-500">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        📅 [{(f.contact_type || []).join(", ")}] - {f.status || "scheduled"}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(f.date).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{f.notes}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upload modal */}
            {uploadModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">Upload Manager Leads</h2>
                            <button
                                onClick={() => { setUploadModalOpen(false); setUploadError(""); setUploadFile(null); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Source (optional)</label>
                                <input
                                    type="text"
                                    value={uploadSource}
                                    onChange={(e) => setUploadSource(e.target.value)}
                                    placeholder="e.g. LinkedIn Scrape, Trade Show, etc."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">CSV / XLSX File *</label>
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Expected columns: Company Name, Contact, Email, First Name, Last Name
                                </p>
                            </div>
                            {uploadError && <div className="text-red-600 text-sm">{uploadError}</div>}
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => { setUploadModalOpen(false); setUploadError(""); setUploadFile(null); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={dataLoading || !uploadFile}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {dataLoading ? "Uploading..." : "Upload"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {selectedCategory && selectedResolveStatus && (
                <StatusUpdateModal
                    isOpen={statusUpdateModalOpen}
                    onClose={() => setStatusUpdateModalOpen(false)}
                    onSubmit={handleStatusUpdate}
                    category={selectedCategory}
                    resolveStatus={selectedResolveStatus}
                    currentLead={currentLead as any}
                    session={session}
                    loading={dataLoading}
                />
            )}
        </div>
    );
}
