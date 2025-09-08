"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ICompanyLead, CompanyLeadStats as CompanyLeadStatsType } from "@/types/companyLead";
import { useApp } from "@/contexts/AppContext";
import CSVUploadModal from "@/app/components/CSVUploadModal";
import CompanyLeadDetailsModal from "@/app/components/CompanyLeadDetailsModal";
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

    // Email form state
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    // Status/Follow-up form state
    const [nextFollowUpDate, setNextFollowUpDate] = useState("");
    const [contactTypes, setContactTypes] = useState<string[]>([]);
    const [followUpNotes, setFollowUpNotes] = useState("");
    const [newStatus, setNewStatus] = useState("contacted");
    const [contactPerson, setcontactPerson] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    const [fieldsLoading, setFieldsLoading] = useState(false);

    // Simple editable fields state
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

    const handleOpenEmail = () => {
        if (!currentLead) return;
        setEmailTo(currentLead.companyEmail || "");
        setEmailSubject("");
        setEmailBody("");
        setEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!currentLead) return;
        try {
            setDataLoading(true);
            const domain = (session as any)?.assignedDomain;
            const res = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody, domain })
            });
            const result = await res.json();
            if (res.ok) {
                showToast("Email sent successfully", "success");
                setEmailModalOpen(false);
                // Record contact history
                await fetch(`/api/company-leads/${(currentLead as any)._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contactTypes: ["email"], notes: emailSubject || "Email sent" })
                });
            } else {
                showToast(result?.error || "Failed to send email", "error");
            }
        } catch (e) {
            showToast("Failed to send email", "error");
        } finally {
            setDataLoading(false);
        }
    };

    const toggleContactType = (type: string) => {
        setContactTypes((prev) => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleApplyStatusAndFollowUp = async () => {
        if (!currentLead) return;
        try {
            setDataLoading(true);
            const payload: any = {
                status: newStatus,
                notes: followUpNotes,
                contactTypes,
            };
            if (nextFollowUpDate) payload.nextFollowUp = nextFollowUpDate;
            if (contactPerson) payload.contactPerson = contactPerson;
            if (contactEmail) payload.contactEmail = contactEmail;
            if (contactPhone) payload.contactPhone = contactPhone;
            const res = await fetch(`/api/company-leads/${(currentLead as any)._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setCurrentLead(result.lead);
                setFollowUpModalOpen(false);
                showToast("Lead updated", "success");
            } else {
                showToast("Failed to update lead", "error");
            }
        } catch (e) {
            showToast("Failed to update lead", "error");
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
                if (status === "converted" || status === "lost") {
                    // Clear lead when resolved
                    setCurrentLead(null);
                    router.replace('/company-leads');
                    showToast("Lead resolved successfully!", "success");
                } else {
                    setCurrentLead(result.lead);
                    showToast("Lead status updated successfully!", "success");
                }
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
                                disabled={dataLoading}
                                className="bg-green-600 hover:bg-green-700 text-white px-12 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap min-w-[160px]"
                            >
                                {dataLoading ? "⏳ Loading..." : "📞 Get Lead"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Current Lead Display */}
                {currentLead && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        {/* Header with action buttons */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{currentLead.companyName}</h2>
                                <p className="text-sm text-gray-500">
                                    <span className="font-medium">📧 {currentLead.companyEmail || "No email"}</span> |
                                    <span className="font-medium ml-2">📞 {currentLead.contactNo || "No phone"}</span>
                                </p>
                                <p className="text-sm text-gray-500">Status: <span className="font-medium">{currentLead.status}</span></p>
                                {currentLead.assignedAt && (
                                    <p className="text-sm text-gray-500">Assigned: {new Date(currentLead.assignedAt).toLocaleDateString()}</p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleOpenEmail}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                                >
                                    Send Email
                                </button>
                                <button
                                    onClick={() => setFollowUpModalOpen(true)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                                >
                                    Add Follow-up
                                </button>
                                <button
                                    onClick={() => {
                                        if (typeof currentLead._id === "string" && currentLead._id) {
                                            handleResolveLead(currentLead._id, "converted");
                                        } else {
                                            console.error("Invalid lead id");
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                                >
                                    Resolve
                                </button>
                            </div>
                        </div>

                        {/* Comprehensive editable fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

                        {/* Contact History summary */}
                        {Array.isArray((currentLead as any).contactHistory) && (currentLead as any).contactHistory.length > 0 && (
                            <div className="mt-6 border-t pt-6">
                                <h3 className="font-medium mb-3 text-gray-900">Contact History</h3>
                                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-auto">
                                    <ul className="space-y-3">
                                        {(currentLead as any).contactHistory.slice(-10).reverse().map((h: any, idx: number) => (
                                            <li key={idx} className="bg-white rounded p-3 border-l-4 border-blue-500">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        [{(h.type || []).join(", ")}] - {h.status}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(h.date).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{h.notes}</p>
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

            {/* Send Email Modal */}
            {emailModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4">
                        <h2 className="text-xl font-semibold mb-4">Send Email ({(session as any)?.assignedDomain || "No domain"})</h2>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">To</label>
                                <input className="w-full border rounded px-3 py-2" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Subject</label>
                                <input className="w-full border rounded px-3 py-2" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                            </div>
                        </div>
                        <div className="mb-4">
                            <CKEditorWrapper value={emailBody} onChange={(v: string) => setEmailBody(v)} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className="px-4 py-2 border rounded" onClick={() => setEmailModalOpen(false)}>Cancel</button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSendEmail}>Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Follow-up / Status Modal */}
            {followUpModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                        <h2 className="text-xl font-semibold mb-4">Update Status / Follow-up</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select className="w-full border rounded px-3 py-2" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                                    <option value="new">new</option>
                                    <option value="pending">pending</option>
                                    <option value="follow_up">follow_up</option>
                                    <option value="contacted">contacted</option>
                                    <option value="qualified">qualified</option>
                                    <option value="converted">converted</option>
                                    <option value="lost">lost</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Next Follow-up</label>
                                <input type="date" className="w-full border rounded px-3 py-2" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex items-center gap-6 mb-4">
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contactTypes.includes("email")} onChange={() => toggleContactType("email")} /> Email</label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contactTypes.includes("call")} onChange={() => toggleContactType("call")} /> Call</label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contactTypes.includes("chat")} onChange={() => toggleContactType("chat")} /> Chat</label>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <input className="border rounded px-3 py-2" placeholder="Contact person name (optional)" value={contactPerson} onChange={e => setcontactPerson(e.target.value)} />
                            <input className="border rounded px-3 py-2" placeholder="Contact email (optional)" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                            <input className="border rounded px-3 py-2" placeholder="Contact phone (optional)" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                        </div>
                        <textarea className="w-full border rounded px-3 py-2 mb-4" rows={3} placeholder="Notes (optional)" value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button className="px-4 py-2 border rounded" onClick={() => setFollowUpModalOpen(false)}>Cancel</button>
                            <button className="px-4 py-2 bg-yellow-600 text-white rounded" onClick={handleApplyStatusAndFollowUp}>Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
