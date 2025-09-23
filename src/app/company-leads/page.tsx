"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ICompanyLead, CompanyLeadStats as CompanyLeadStatsType } from "@/types/companyLead";
import { useApp } from "@/contexts/AppContext";
import CSVUploadModal from "@/app/components/CSVUploadModal";
import FollowUpModal from "@/app/components/FollowUpModal";
import StatusDropdown from "@/app/components/StatusDropdown";
import StatusUpdateModal from "@/app/components/StatusUpdateModal";
import { StatusCategory, StatusUpdateData } from "@/types/companyLead";
import { domainShortCodes, getDomainEmail } from "@/utils/helper";
import { getStateCurrentTime } from "@/utils/stateMapping";
import dynamic from "next/dynamic";
import { Eye } from "lucide-react";

const CKEditorWrapper = dynamic(() => import("@/app/components/CKEditorWrapper"), {
    ssr: false,
    loading: () => <div className="p-4 border rounded">Loading editor...</div>
});

export default function CompanyLeadsPage() {
    const { session, loading, showToast } = useApp();
    const router = useRouter();
    const searchParams = useSearchParams();

    // State management
    const [currentLead, setCurrentLead] = useState<ICompanyLead | null>(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [assignedLeadsCount, setAssignedLeadsCount] = useState({
        total: 0,
        today: 0,
        week: 0,
        month: 0,
        byDomain: {} as Record<string, number>,
        quota: {
            daily: 100,
            current: 0
        }
    });
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [leadDetailsModalOpen, setLeadDetailsModalOpen] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [contactInfoModalOpen, setContactInfoModalOpen] = useState(false);

    // New status system state
    const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<StatusCategory | null>(null);
    const [selectedResolveStatus, setSelectedResolveStatus] = useState("");

    // Status/Follow-up form state
    const [nextFollowUpDate, setNextFollowUpDate] = useState("");
    const [contactTypes, setContactTypes] = useState<string[]>([]);
    const [followUpNotes, setFollowUpNotes] = useState("");
    const [newStatus, setNewStatus] = useState("contacted");
    const [contactPerson, setcontactPerson] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    const [fieldsLoading, setFieldsLoading] = useState(false);

    const [leadFields, setLeadFields] = useState({
        companyEmail: "",
        contactNo: "",
        companyWebsite: "",
        address: "",
        city: "",
        state: "",
        country: "",
        industry: "",
        companySize: "",
        contactPerson: "",
        contactPersonEmail: "",
        contactPersonPhone: "",
        notes: "",
        socials: {
            linkedin: "",
            facebook: "",
            twitter: "",
            instagram: ""
        }
    });

    // Fetch assigned leads count
    const fetchAssignedLeadsCount = async () => {
        try {
            const response = await fetch("/api/company-leads/assigned-count");
            const result = await response.json();
            if (result.success) {
                setAssignedLeadsCount(result.data);
            }
        } catch (error) {
            console.error("Error fetching assigned leads count:", error);
        }
    };

    // Load assigned leads count on component mount
    useEffect(() => {
        if (session) {
            fetchAssignedLeadsCount();
        }
    }, [session]);

    // Load lead from URL parameter if present
    useEffect(() => {
        const leadId = searchParams?.get('cl');
        if (leadId && !currentLead) {
            loadLeadById(leadId);
        }
    }, [searchParams, currentLead]);

    // Load lead by ID function
    const loadLeadById = async (leadId: string) => {
        try {
            setDataLoading(true);
            const response = await fetch(`/api/company-leads/${leadId}`);
            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                // Populate editable fields
                setLeadFields({
                    companyEmail: result.lead.companyEmail || "",
                    contactNo: result.lead.contactNo || result.lead.phoneNumber || "",
                    companyWebsite: result.lead.companyWebsite || "",
                    address: result.lead.address || "",
                    city: result.lead.city || "",
                    state: result.lead.state || "",
                    country: result.lead.country || "",
                    industry: result.lead.industry || "",
                    companySize: result.lead.companySize || "",
                    contactPerson: result.lead.contactPerson || "",
                    contactPersonEmail: result.lead.contactPersonEmail || "",
                    contactPersonPhone: result.lead.contactPersonPhone || "",
                    notes: result.lead.notes || "",
                    socials: {
                        linkedin: result.lead.socials?.linkedin || "",
                        facebook: result.lead.socials?.facebook || "",
                        twitter: result.lead.socials?.twitter || "",
                        instagram: result.lead.socials?.instagram || ""
                    }
                });
                showToast("Lead loaded successfully!", "success");
            } else {
                showToast("Lead not found", "error");
                // Remove invalid lead ID from URL
                router.replace('/company-leads');
            }
        } catch (error) {
            console.error("Error loading lead:", error);
            showToast("Error loading lead", "error");
            router.replace('/company-leads');
        } finally {
            setDataLoading(false);
        }
    };


    // Save edited lead fields
    const handleSaveLeadFields = async () => {
        if (!currentLead) return;

        try {
            setFieldsLoading(true);

            // Simple: leadFields jo update kiye hain wahi send kar do
            const response = await fetch(`/api/company-leads/${currentLead._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leadFields)
            });

            const result = await response.json();
            if (result.success) {
                setCurrentLead(result.lead);
                showToast("Lead details updated successfully!", "success");
            } else {
                showToast(result.message || "Failed to update lead", "error");
            }
        } catch (error) {
            console.error("Save lead fields error:", error);
            showToast("Failed to save lead details. Please try again.", "error");
        } finally {
            setFieldsLoading(false);
        }
    };

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


    const toggleContactType = (type: string) => {
        setContactTypes((prev) => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleFollowUpSubmit = async (data: any) => {
        if (!currentLead) return;
        try {
            setDataLoading(true);

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

            const res = await fetch(`/api/company-leads/${(currentLead as any)._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (!result.success) {
                showToast("Failed to update lead status", "error");
                return;
            }

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
                        domain
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

            setCurrentLead(result.lead);
            setFollowUpModalOpen(false);

        } catch (e) {
            console.error("Error in follow-up:", e);
            showToast("Failed to update lead", "error");
        } finally {
            setDataLoading(false);
        }
    };

    // Handle Get Lead
    const handleGetLead = async () => {
        // Allow getting new lead if current lead has been processed (not pending)
        // or if there's no current lead
        if (currentLead && currentLead.status === "pending") {
            showToast("Please update the status of the current lead first", "info");
            return;
        }

        try {
            setDataLoading(true);
            const response = await fetch("/api/company-leads");
            const result = await response.json();

            if (result.success) {
                setCurrentLead(result.lead);
                // Populate editable fields
                setLeadFields({
                    companyEmail: result.lead.companyEmail || "",
                    contactNo: result.lead.contactNo || result.lead.phoneNumber || "",
                    companyWebsite: result.lead.companyWebsite || "",
                    address: result.lead.address || "",
                    city: result.lead.city || "",
                    state: result.lead.state || "",
                    country: result.lead.country || "",
                    industry: result.lead.industry || "",
                    companySize: result.lead.companySize || "",
                    contactPerson: result.lead.contactPerson || "",
                    contactPersonEmail: result.lead.contactPersonEmail || "",
                    contactPersonPhone: result.lead.contactPersonPhone || "",
                    notes: result.lead.notes || "",
                    socials: {
                        linkedin: result.lead.socials?.linkedin || "",
                        facebook: result.lead.socials?.facebook || "",
                        twitter: result.lead.socials?.twitter || "",
                        instagram: result.lead.socials?.instagram || ""
                    }
                });

                // Update URL with lead ID
                const leadId = result.lead._id || result.lead.id;
                if (leadId) {
                    router.replace(`/company-leads?cl=${leadId}`);
                }
                // Increment the counter since a new lead was assigned
                setAssignedLeadsCount(prev => ({
                    ...prev,
                    total: prev.total + 1,
                    today: prev.today + 1,
                    week: prev.week + 1,
                    month: prev.month + 1,
                    byDomain: {
                        ...prev.byDomain,
                        [(session as any)?.assignedDomain || 'unknown']:
                            (prev.byDomain[(session as any)?.assignedDomain || 'unknown'] || 0) + 1
                    },
                    quota: {
                        ...prev.quota,
                        current: prev.quota.current + 1
                    }
                }));
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

    // New status system handlers
    const handleStatusSelect = (category: StatusCategory, resolveStatus: string) => {
        setSelectedCategory(category);
        setSelectedResolveStatus(resolveStatus);
        setStatusUpdateModalOpen(true);
    };

    const handleStatusUpdate = async (data: StatusUpdateData) => {
        if (!currentLead) return;

        try {
            setDataLoading(true);
            const response = await fetch(`/api/company-leads/${currentLead._id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
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
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">OutBound Leads</h1>
                            <p className="text-gray-600 text-lg mb-4">
                                Upload CSV data and get company leads for dialing
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
                                                onClick={() => router.push('/my-assigned-leads')}
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
                        <div className="flex space-x-4">
                            {session?.user_type !== 3 && (
                                <button
                                    onClick={() => setUploadModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap min-w-[160px]"
                                >
                                    📁 Upload CSV
                                </button>
                            )}
                            <button
                                onClick={handleGetLead}
                                disabled={dataLoading || (currentLead?.status === "pending")}
                                className={`px-12 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap min-w-[160px] ${currentLead?.status === "pending"
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

                {/* Current Lead Display */}
                {currentLead && (
                    <div className="company-lead-wrapper bg-white rounded-lg shadow p-6 mb-6">
                        {/* Header with action buttons */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{currentLead.companyName}</h2>
                                <p className="text-sm text-gray-500">
                                    <span className="font-medium">📧 {currentLead.companyEmail || "No email"}</span> |
                                    <span className="font-medium ml-2">📞 {currentLead.contactNo || "No phone"}</span>
                                    <span className="font-medium ml-2">📍 {currentLead.state || "No state"}</span>
                                    {currentLead.state && (
                                        <span className="font-medium ml-2">🕐 {getStateCurrentTime(currentLead.state)}</span>
                                    )}
                                </p>
                                <p className="text-sm text-gray-500">Status: <span className="font-medium">{currentLead.status}</span></p>
                                {currentLead.assignedAt && (
                                    <p className="text-sm text-gray-500">Assigned: {new Date(currentLead.assignedAt).toLocaleDateString()}</p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
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

                        {/* Comprehensive editable fields - Outbound Leads */}
                        <div className="company-information-wrapper grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {/* Company Information */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Company Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.companyEmail}
                                    onChange={(e) => setLeadFields({ ...leadFields, companyEmail: e.target.value })}
                                    placeholder="company@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
                                <input
                                    type="tel"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.contactNo}
                                    onChange={(e) => setLeadFields({ ...leadFields, contactNo: e.target.value })}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Company Website</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.companyWebsite}
                                    onChange={(e) => setLeadFields({ ...leadFields, companyWebsite: e.target.value })}
                                    placeholder="https://company.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.industry}
                                    onChange={(e) => setLeadFields({ ...leadFields, industry: e.target.value })}
                                    placeholder="Technology, Healthcare, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Company Size</label>
                                <select
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.companySize}
                                    onChange={(e) => setLeadFields({ ...leadFields, companySize: e.target.value })}
                                >
                                    <option value="">Select size</option>
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-500">201-500 employees</option>
                                    <option value="501-1000">501-1000 employees</option>
                                    <option value="1000+">1000+ employees</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.state}
                                    onChange={(e) => setLeadFields({ ...leadFields, state: e.target.value })}
                                    placeholder="California, Texas, etc."
                                />
                            </div>

                            {/* Contact Person Information */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.contactPerson}
                                    onChange={(e) => setLeadFields({ ...leadFields, contactPerson: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.contactPersonEmail}
                                    onChange={(e) => setLeadFields({ ...leadFields, contactPersonEmail: e.target.value })}
                                    placeholder="john@company.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person Phone</label>
                                <input
                                    type="tel"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.contactPersonPhone}
                                    onChange={(e) => setLeadFields({ ...leadFields, contactPersonPhone: e.target.value })}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            {/* Address Information */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.address}
                                    onChange={(e) => setLeadFields({ ...leadFields, address: e.target.value })}
                                    placeholder="123 Main St, City, State"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.city}
                                    onChange={(e) => setLeadFields({ ...leadFields, city: e.target.value })}
                                    placeholder="New York"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.country}
                                    onChange={(e) => setLeadFields({ ...leadFields, country: e.target.value })}
                                    placeholder="United States"
                                />
                            </div>

                            {/* Social Media */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.socials.linkedin}
                                    onChange={(e) => setLeadFields({ ...leadFields, socials: { ...leadFields.socials, linkedin: e.target.value } })}
                                    placeholder="https://linkedin.com/company/..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Facebook URL</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.socials.facebook}
                                    onChange={(e) => setLeadFields({ ...leadFields, socials: { ...leadFields.socials, facebook: e.target.value } })}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Twitter URL</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.socials.twitter}
                                    onChange={(e) => setLeadFields({ ...leadFields, socials: { ...leadFields.socials, twitter: e.target.value } })}
                                    placeholder="https://twitter.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Instagram URL</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={leadFields.socials.instagram}
                                    onChange={(e) => setLeadFields({ ...leadFields, socials: { ...leadFields.socials, instagram: e.target.value } })}
                                    placeholder="https://instagram.com/..."
                                />
                            </div>
                        </div>

                        {/* Notes section */}
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

                        {/* Save button */}
                        <div className="flex justify-end mb-6">
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

                {/* Instructions */}
                {/* <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
                    <div className="space-y-2 text-gray-600">
                        <p>• <strong>Upload CSV:</strong> Upload company data in CSV format</p>
                        <p>• <strong>Get Lead:</strong> Get a lead from states currently in business hours (9:30 AM - 5:00 PM). Update status to get new leads.</p>
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

            {/* Follow-up Modal */}
            <FollowUpModal
                isOpen={followUpModalOpen}
                onClose={() => setFollowUpModalOpen(false)}
                onSubmit={handleFollowUpSubmit}
                currentLead={currentLead}
                session={session}
                loading={dataLoading}
            />

            {/* Status Update Modal */}
            {selectedCategory && selectedResolveStatus && (
                <StatusUpdateModal
                    isOpen={statusUpdateModalOpen}
                    onClose={() => setStatusUpdateModalOpen(false)}
                    onSubmit={handleStatusUpdate}
                    category={selectedCategory}
                    resolveStatus={selectedResolveStatus}
                    currentLead={currentLead}
                    session={session}
                    loading={dataLoading}
                />
            )}
        </div>
    );
}
