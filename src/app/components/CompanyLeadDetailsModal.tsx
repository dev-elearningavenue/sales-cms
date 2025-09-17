import React, { useState, useEffect } from "react";
import { ICompanyLead } from "@/types/companyLead";

interface CompanyLeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: ICompanyLead | null;
    onUpdate: (leadId: string, updates: Partial<ICompanyLead>) => void;
}

const CompanyLeadDetailsModal: React.FC<CompanyLeadDetailsModalProps> = ({
    isOpen,
    onClose,
    lead,
    onUpdate,
}) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<ICompanyLead>>({});

    useEffect(() => {
        if (lead) {
            setFormData(lead);
        }
    }, [lead]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch("/api/users");
                const data = await response.json();
                if (data.success) {
                    setUsers(data.users);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (lead && formData && typeof lead._id === "string") {
            await onUpdate(lead._id, { ...formData });
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        if (lead) {
            setFormData(lead);
        }
        setIsEditing(false);
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString();
    };

    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Company Lead Details</h2>
                    <div className="flex space-x-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Company Name
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.companyName || ""}
                                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.companyName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Company Email
                            </label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.companyEmail || ""}
                                    onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.companyEmail || "N/A"}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Number
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.contactNo || ""}
                                    onChange={(e) => handleInputChange("contactNo", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.contactNo}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Website
                                </label>
                                {isEditing ? (
                                    <input
                                        type="url"
                                        value={formData.companyWebsite || ""}
                                        onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{lead.companyWebsite || "N/A"}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    LinkedIn
                                </label>
                                {isEditing ? (
                                    <input
                                        type="url"
                                        value={formData.socials?.linkedin || ""}
                                        onChange={(e) => handleInputChange("socials", { ...formData.socials, linkedin: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">
                                        {lead.socials?.linkedin ? (
                                            <a href={lead.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {lead.socials.linkedin}
                                            </a>
                                        ) : (
                                            "N/A"
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={formData.address || ""}
                                    onChange={(e) => handleInputChange("address", e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.address}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.city || ""}
                                        onChange={(e) => handleInputChange("city", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{lead.city || "N/A"}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.state || ""}
                                        onChange={(e) => handleInputChange("state", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{lead.state}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Zip Code
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.zipCode || ""}
                                        onChange={(e) => handleInputChange("zipCode", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{lead.zipCode || "N/A"}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Country
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.country || ""}
                                        onChange={(e) => handleInputChange("country", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{lead.country || "N/A"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lead Management */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Lead Management</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            {isEditing ? (
                                <select
                                    value={formData.status || "new"}
                                    onChange={(e) => handleInputChange("status", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="converted">Converted</option>
                                    <option value="lost">Lost</option>
                                </select>
                            ) : (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${lead.status === "pending" ? "bg-gray-100 text-gray-800" :
                                        lead.status === "processing" ? "bg-blue-100 text-blue-800" :
                                            lead.status === "resolved" ? "bg-green-100 text-green-800" :
                                                lead.status === "closed" ? "bg-red-100 text-red-800" :
                                                    lead.status === "follow_up" ? "bg-yellow-100 text-yellow-800" :
                                                        "bg-gray-200 text-gray-700"
                                    }`}>
                                    {lead.status}
                                </span>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assigned To
                            </label>
                            {isEditing ? (
                                <select
                                    value={typeof formData.assignedTo === 'object' && formData.assignedTo?._id ? formData.assignedTo._id.toString() : formData.assignedTo?.toString() || ""}
                                    onChange={(e) => handleInputChange("assignedTo", e.target.value || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Unassigned</option>
                                    {users.map((user) => (
                                        <option key={user._id} value={user._id}>
                                            {user.firstName} {user.lastName}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-gray-900">
                                    {lead.assignedTo && typeof lead.assignedTo === 'object' && 'firstName' in lead.assignedTo && 'lastName' in lead.assignedTo
                                        ? `${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`
                                        : "Unassigned"}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Next Follow-up
                            </label>
                            {isEditing ? (
                                <input
                                    type="datetime-local"
                                    value={formData.nextFollowUp ? new Date(formData.nextFollowUp).toISOString().slice(0, 16) : ""}
                                    onChange={(e) => handleInputChange("nextFollowUp", e.target.value ? new Date(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">
                                    {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "Not scheduled"}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Conversion Value
                            </label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={formData.conversionValue || 0}
                                    onChange={(e) => handleInputChange("conversionValue", Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">${lead.conversionValue || 0}</p>
                            )}
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Industry
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.industry || ""}
                                    onChange={(e) => handleInputChange("industry", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.industry || "N/A"}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Company Size
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.companySize || ""}
                                    onChange={(e) => handleInputChange("companySize", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.companySize || "N/A"}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Person
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.contactPerson || ""}
                                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.contactPerson || "N/A"}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Person
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.contactPerson || ""}
                                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{lead.contactPerson || "N/A"}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                General Notes
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={formData.notes || ""}
                                    onChange={(e) => handleInputChange("notes", e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add general notes about this lead..."
                                />
                            ) : (
                                <p className="text-gray-900">{lead.notes || "No notes available"}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Follow-up Notes
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={formData.followUpNotes || ""}
                                    onChange={(e) => handleInputChange("followUpNotes", e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add follow-up notes..."
                                />
                            ) : (
                                <p className="text-gray-900">{lead.followUpNotes || "No follow-up notes available"}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Follow-up History */}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up History</h3>
                    <div className="space-y-3">
                        {lead.next_follow_up && lead.next_follow_up.length > 0 ? (
                            lead.next_follow_up.map((followUp, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatDate(followUp.date)}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                Contact Type: {followUp.contact_type.join(", ")}
                                            </div>
                                            {followUp.notes && (
                                                <div className="text-sm text-gray-700 mt-2">
                                                    {followUp.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No follow-up history available</p>
                        )}
                    </div>
                </div>

                {/* Metadata */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-md text-gray-500">
                        <div>
                            <span className="font-medium">Domain:</span> {lead.domain}
                        </div>
                        <div>
                            <span className="font-medium">Created:</span> {formatDate(lead.createdAt!)}
                        </div>
                        <div>
                            <span className="font-medium">Last Updated:</span> {formatDate(lead.updatedAt!)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyLeadDetailsModal;
