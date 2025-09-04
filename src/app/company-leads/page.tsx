"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ICompanyLead, CompanyLeadStats as CompanyLeadStatsType } from "@/types/companyLead";
import { useApp } from "@/contexts/AppContext";
import CSVUploadModal from "@/app/components/CSVUploadModal";
import CompanyLeadDetailsModal from "@/app/components/CompanyLeadDetailsModal";
import CompanyLeadTable from "@/app/components/CompanyLeadTable";
import CompanyLeadStats from "@/app/components/CompanyLeadStats";
import CompanyLeadFilters from "@/app/components/CompanyLeadFilters";

export default function CompanyLeadsPage() {
    const { session, loading, showToast } = useApp();
    const router = useRouter();

    // State management
    const [currentLead, setCurrentLead] = useState<ICompanyLead | null>(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [leadDetailsModalOpen, setLeadDetailsModalOpen] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [contactInfoModalOpen, setContactInfoModalOpen] = useState(false);

    // Handle CSV upload
    const handleCSVUpload = async (file: File, state?: string) => {
        try {
            setDataLoading(true);
            const formData = new FormData();
            formData.append("file", file);
            if (state) formData.append("state", state);

            const response = await fetch("/api/company-leads", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                showToast("CSV uploaded successfully!", "success");
                setUploadModalOpen(false);
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

    // Handle Get Lead
    const handleGetLead = async () => {
        if (currentLead) {
            showToast("Please resolve or update the current lead first", "info");
            return;
        }

        try {
            setDataLoading(true);
            const response = await fetch("/api/company-leads");
            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                showToast(`Found lead: ${result.lead.companyName} from ${result.lead.state}`, "success");
            } else {
                showToast(result.message, "error");
            }
        } catch (error) {
            console.error("Get lead error:", error);
            showToast("Failed to get lead. Please try again.", "error");
        } finally {
            setDataLoading(false);
        }
    };

    // Handle lead resolution
    const handleResolveLead = async (leadId: string, status: string) => {
        try {
            const response = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                showToast("Lead status updated successfully!", "success");
            } else {
                showToast("Failed to update lead status.", "error");
            }
        } catch (error) {
            console.error("Update error:", error);
            showToast("Failed to update lead.", "error");
        }
    };

    // Handle follow-up
    const handleFollowUp = async (leadId: string, followUpData: any) => {
        try {
            const response = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    followUpEntry: followUpData,
                    nextFollowUp: followUpData.nextFollowUp,
                    followUpNotes: followUpData.notes
                }),
            });

            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                setFollowUpModalOpen(false);
                showToast("Follow-up added successfully!", "success");
            } else {
                showToast("Failed to add follow-up.", "error");
            }
        } catch (error) {
            console.error("Follow-up error:", error);
            showToast("Failed to add follow-up.", "error");
        }
    };

    // Handle contact info update
    const handleContactInfoUpdate = async (leadId: string, contactInfo: any) => {
        try {
            const response = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactInfo),
            });

            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                setContactInfoModalOpen(false);
                showToast("Contact information updated successfully!", "success");
            } else {
                showToast("Failed to update contact information.", "error");
            }
        } catch (error) {
            console.error("Contact info error:", error);
            showToast("Failed to update contact information.", "error");
        }
    };

    // Redirect if not authenticated
    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!session) {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Company Leads</h1>
                            <p className="mt-2 text-gray-600">
                                Upload CSV data and get Leads for Dialing
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setUploadModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                            >
                                Upload CSV
                            </button>
                            <button
                                onClick={handleGetLead}
                                disabled={dataLoading}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                            >
                                {dataLoading ? "Loading..." : "Get Lead"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Current Lead Display */}
                {currentLead && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{currentLead.companyName}</h2>
                                <p className="text-gray-600">{currentLead.companyEmail}</p>
                                <p className="text-gray-600">{currentLead.phoneNumber}</p>
                                <p className="text-gray-600">{currentLead.state}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setEmailModalOpen(true)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                                >
                                    Send Email
                                </button>
                                <button
                                    onClick={() => setFollowUpModalOpen(true)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
                                >
                                    Add Follow-up
                                </button>
                                <button
                                    onClick={() => setContactInfoModalOpen(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                                >
                                    Update Contact
                                </button>
                                <button
                                    onClick={() => {
                                        if (typeof currentLead._id === "string" && currentLead._id) {
                                            handleResolveLead(currentLead._id, "converted");
                                        } else {
                                            console.error("Invalid lead id");
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                                >
                                    Resolve
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Address:</span> {currentLead.address}
                            </div>
                            <div>
                                <span className="font-medium">Status:</span> {currentLead.status}
                            </div>
                            <div>
                                <span className="font-medium">Company Size:</span> {currentLead.companySize || "N/A"}
                            </div>
                            <div>
                                <span className="font-medium">Industry:</span> {currentLead.industry || "N/A"}
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {/* <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
                    <div className="space-y-2 text-gray-600">
                        <p>• <strong>Upload CSV:</strong> Upload company data in CSV format</p>
                        <p>• <strong>Get Lead:</strong> Get a lead from states currently in business hours (9:30 AM - 5:00 PM)</p>
                        <p>• <strong>Send Email:</strong> Use CKEditor to compose and send emails</p>
                        <p>• <strong>Add Follow-up:</strong> Schedule next follow-up with notes</p>
                        <p>• <strong>Update Contact:</strong> Save new contact information from calls</p>
                        <p>• <strong>Resolve:</strong> Mark lead as converted</p>
                    </div>
                </div> */}
            </div>

            {/* Modals */}
            <CSVUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onUpload={handleCSVUpload}
                loading={dataLoading}
            />

            {/* Add other modals here */}
        </div>
    );
}
