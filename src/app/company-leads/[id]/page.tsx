"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { ICompanyLead } from "@/models/companyLead";
import { domainShortCodes, getDomainEmail } from "@/utils/helper";
import FollowUpModal from "@/app/components/FollowUpModal";
import StatusDropdown from "@/app/components/StatusDropdown";
import StatusUpdateModal from "@/app/components/StatusUpdateModal";
import ResolveHistory from "@/app/components/ResolveHistory";
import EmailHistory from "@/app/components/EmailHistory";
import { StatusCategory, StatusUpdateData } from "@/types/companyLead";
import { ArrowLeft, Save, Calendar, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

export default function CompanyLeadDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { session, showToast } = useApp();

    const [lead, setLead] = useState<ICompanyLead | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<ICompanyLead>>({});

    // Follow-up modal state
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

    // New status system state
    const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<StatusCategory | null>(null);
    const [selectedResolveStatus, setSelectedResolveStatus] = useState<string>("");
    const [showAllFollowUps, setShowAllFollowUps] = useState(false);

    const leadId = params.id as string;

    useEffect(() => {
        if (leadId) {
            fetchLeadDetails();
        }
    }, [leadId]);

    const fetchLeadDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/company-leads/${leadId}`);
            const data = await response.json();

            if (data.success) {
                setLead(data.lead);
                setFormData(data.lead);
            } else {
                showToast("Failed to fetch lead details", "error");
                router.push("/my-assigned-leads");
            }
        } catch (error) {
            console.error("Error fetching lead:", error);
            showToast("Error fetching lead details", "error");
            router.push("/my-assigned-leads");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveChanges = async () => {
        if (!lead) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setLead(data.lead);
                setIsEditing(false);
                showToast("Lead updated successfully", "success");
            } else {
                showToast(data.message || "Failed to update lead", "error");
            }
        } catch (error) {
            console.error("Error updating lead:", error);
            showToast("Error updating lead", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleFollowUpSubmit = async (data: any) => {
        if (!lead) return;
        try {
            setSaving(true);

            // First, update the lead status and follow-up
            const payload: any = {
                status: data.status,
                notes: data.followUpNotes,
                contactTypes: data.contactTypes,
            };
            if (data.nextFollowUpDate) payload.nextFollowUp = data.nextFollowUpDate;
            if (data.contactPerson) payload.contactPerson = data.contactPerson;
            if (data.contactEmail) payload.contactEmail = data.contactEmail;
            if (data.contactPhone) payload.contactPhone = data.contactPhone;

            const res = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (!result.success) {
                showToast("Failed to update lead status", "error");
                return;
            }

            // Then, send the email if email fields are filled
            if (data.emailTo && data.emailSubject && data.emailBody) {
                const domain = domainShortCodes[(session as any)?.assignedDomain];
                // console.log("Sending email with domain: ", domain);

                const emailResponse = await fetch("/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: data.emailTo,
                        subject: data.emailSubject,
                        body: data.emailBody,
                        domain,
                        leadType: "outbound"
                    })
                });

                const emailResult = await emailResponse.json();
                if (emailResult.success) {
                    showToast("Status updated and email sent successfully", "success");
                } else {
                    showToast("Lead updated but email failed to send", "error");
                }
            } else {
                showToast("Lead updated successfully", "success");
            }

            setLead(result.lead);
            setFormData(result.lead);
            setFollowUpModalOpen(false);

        } catch (e) {
            console.error("Error in follow-up:", e);
            showToast("Failed to update lead", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!lead) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/company-leads/${leadId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setLead(data.lead);
                setIsEditing(false);
                showToast("Lead updated successfully", "success");
            } else {
                showToast(data.message || "Failed to update lead", "error");
            }
        } catch (error) {
            console.error("Error updating lead:", error);
            showToast("Error updating lead", "error");
        } finally {
            setSaving(false);
        }
    };

    // Handle status category and resolve status selection
    const handleStatusSelect = (category: StatusCategory, resolveStatus: string) => {
        setSelectedCategory(category);
        setSelectedResolveStatus(resolveStatus);
        setStatusUpdateModalOpen(true);
    };

    // Handle status update submission
    const handleStatusUpdate = async (statusData: StatusUpdateData) => {
        if (!lead) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/company-leads/${leadId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(statusData),
            });

            const result = await response.json();

            if (result.success) {
                setLead(result.lead);
                setStatusUpdateModalOpen(false);
                showToast("Lead status updated successfully!", "success");

                if (result.emailResult && !result.emailResult.success) {
                    showToast("Status updated but email failed to send", "info");
                }
            } else {
                showToast(result.message || "Failed to update lead status", "error");
            }
        } catch (error) {
            console.error("Error updating lead status:", error);
            showToast("Error updating lead status", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading lead details...</p>
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Lead Not Found</h1>
                    <p className="text-gray-600 mb-6">The lead you're looking for doesn't exist or has been removed.</p>
                    <button
                        onClick={() => router.push("/my-assigned-leads")}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Back to My Leads
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header with Back and Edit buttons */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push("/my-assigned-leads")}
                            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {lead.companyName}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="min-w-[200px]">
                            <StatusDropdown
                                onStatusSelect={handleStatusSelect}
                                disabled={saving}
                                currentCategory={lead.statusCategory}
                                currentResolveStatus={lead.resolveStatus}
                            />
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isEditing
                                ? "bg-gray-600 text-white hover:bg-gray-700"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                        >
                            {isEditing ? "Cancel" : "Edit"}
                        </button>
                        {isEditing && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Saving..." : "Save"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="company-information-wrapper grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lead Information */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Company Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.companyName || ""}
                                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Company Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Email
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.companyEmail || ""}
                                        onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Contact Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Number
                                    </label>
                                    <input
                                        type="tel"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.contactNo || ""}
                                        onChange={(e) => handleInputChange("contactNo", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Company Website */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Website
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.companyWebsite || ""}
                                        onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.address || ""}
                                        onChange={(e) => handleInputChange("address", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.city || ""}
                                        onChange={(e) => handleInputChange("city", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* State */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.state || ""}
                                        onChange={(e) => handleInputChange("state", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.country || ""}
                                        onChange={(e) => handleInputChange("country", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Industry */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Industry
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.industry || ""}
                                        onChange={(e) => handleInputChange("industry", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Company Size */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Size
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.companySize || ""}
                                        onChange={(e) => handleInputChange("companySize", e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            {/* Contact Person Section */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                                    Contact Person Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Contact Person */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.contactPerson || ""}
                                            onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                                            disabled={!isEditing}
                                        />
                                    </div>

                                    {/* Contact Person Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Person Email
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.contactPersonEmail || ""}
                                            onChange={(e) => handleInputChange("contactPersonEmail", e.target.value)}
                                            disabled={!isEditing}
                                        />
                                    </div>

                                    {/* Contact Person Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Person Phone
                                        </label>
                                        <input
                                            type="tel"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.contactPersonPhone || ""}
                                            onChange={(e) => handleInputChange("contactPersonPhone", e.target.value)}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                                    Additional Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Status */}
                                    {/* <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.status || ""}
                                        onChange={(e) => handleInputChange("status", e.target.value)}
                                        disabled={!isEditing}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Contacted</option>
                                        <option value="follow_up">Follow Up</option>
                                        <option value="resolved">Qualified</option>
                                        <option value="closed">Converted</option>
                                    </select>
                                </div> */}

                                    {/* Notes */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Notes
                                        </label>
                                        <textarea
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows={3}
                                            value={formData.notes || ""}
                                            onChange={(e) => handleInputChange("notes", e.target.value)}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => router.push("/my-assigned-leads")}
                                    className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </button>

                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Edit
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData(lead);
                                            }}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveChanges}
                                            disabled={saving}
                                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Resolve History */}
                        <ResolveHistory
                            history={lead.resolveHistory || []}
                            loading={saving}
                        />

                        {/* Follow-up History */}
                        <div className="bg-white rounded-lg shadow-sm border p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Follow-up History
                                    {lead.next_follow_up && lead.next_follow_up.length > 0 && (
                                        <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                                            {lead.next_follow_up.length}
                                        </span>
                                    )}
                                </h3>
                                {lead.next_follow_up && lead.next_follow_up.length > 1 && (
                                    <button
                                        onClick={() => setShowAllFollowUps(!showAllFollowUps)}
                                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        {showAllFollowUps ? (
                                            <>
                                                <ChevronUp className="h-4 w-4 mr-1" />
                                                Show Less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4 mr-1" />
                                                Show All ({lead.next_follow_up.length})
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            {lead.next_follow_up && lead.next_follow_up.length > 0 ? (
                                <div className="space-y-2">
                                    {(showAllFollowUps ? lead.next_follow_up : lead.next_follow_up.slice(-2)).reverse().map((followUp: any, index: number) => (
                                        <div key={index} className="border-l-4 border-yellow-500 pl-3 py-2 bg-yellow-50 rounded-r-lg">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                    Follow-up
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(followUp.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-700">{followUp.notes}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No follow-up history available.</p>
                                </div>
                            )}
                        </div>

                        {/* Email History */}
                        <EmailHistory
                            emails={lead.emails || []}
                            loading={saving}
                        />
                    </div>
                </div>
            </div>

            {/* Follow-up Modal */}
            <FollowUpModal
                isOpen={followUpModalOpen}
                onClose={() => setFollowUpModalOpen(false)}
                onSubmit={handleFollowUpSubmit}
                currentLead={lead}
                session={session}
                loading={saving}
            />

            {/* Status Update Modal */}
            {selectedCategory && selectedResolveStatus && (
                <StatusUpdateModal
                    isOpen={statusUpdateModalOpen}
                    onClose={() => setStatusUpdateModalOpen(false)}
                    onSubmit={handleStatusUpdate}
                    category={selectedCategory}
                    resolveStatus={selectedResolveStatus}
                    currentLead={lead}
                    session={session}
                    loading={saving}
                />
            )}
        </div>
    );
}