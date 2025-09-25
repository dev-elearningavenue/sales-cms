"use client";

import React, { useState, useEffect } from "react";
import { ICompanyLead } from "@/models/companyLead";
import { StatusCategory, StatusUpdateData } from "@/types/companyLead";
import { domainShortCodes, getDomainEmail } from "@/utils/helper";
import { getStateCurrentTime } from "@/utils/stateMapping";
import FollowUpModal from "./FollowUpModal";
import StatusDropdown from "./StatusDropdown";
import StatusUpdateModal from "./StatusUpdateModal";
import ResolveHistory from "./ResolveHistory";
import EmailHistory from "./EmailHistory";
import {
    X,
    Save,
    Calendar,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Edit3,
    Phone,
    Mail,
    MapPin,
    Globe,
    Building,
    User,
    Clock
} from "lucide-react";

interface CompanyLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: ICompanyLead | null;
    onLeadUpdate?: (updatedLead: ICompanyLead) => void;
}

export default function CompanyLeadModal({
    isOpen,
    onClose,
    lead,
    onLeadUpdate
}: CompanyLeadModalProps) {
    const [currentLead, setCurrentLead] = useState<ICompanyLead | null>(lead);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<ICompanyLead>>({});

    // Follow-up modal state
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

    // Status update modal state
    const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<StatusCategory | null>(null);
    const [selectedResolveStatus, setSelectedResolveStatus] = useState<string>("");
    const [showAllFollowUps, setShowAllFollowUps] = useState(false);

    useEffect(() => {
        if (lead) {
            setCurrentLead(lead);
            setFormData(lead);
        }
    }, [lead]);

    const handleInputChange = (field: keyof ICompanyLead, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        if (!currentLead) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/company-leads/${currentLead._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setCurrentLead(data.lead);
                setIsEditing(false);
                onLeadUpdate?.(data.lead);
            } else {
                console.error('Failed to update lead:', data.message);
            }
        } catch (error) {
            console.error('Error updating lead:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleStatusSelect = (category: StatusCategory) => {
        setSelectedCategory(category);
        setSelectedResolveStatus("");
        setStatusUpdateModalOpen(true);
    };

    const handleStatusUpdate = async (statusData: StatusUpdateData) => {
        if (!currentLead) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/company-leads/${currentLead._id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(statusData),
            });

            const data = await response.json();

            if (data.success) {
                setCurrentLead(data.lead);
                onLeadUpdate?.(data.lead);
                setStatusUpdateModalOpen(false);
            } else {
                console.error('Failed to update status:', data.message);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleFollowUpSubmit = async (followUpData: any) => {
        if (!currentLead) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/company-leads/${currentLead._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nextFollowUp: followUpData
                }),
            });

            const data = await response.json();

            if (data.success) {
                setCurrentLead(data.lead);
                onLeadUpdate?.(data.lead);
                setFollowUpModalOpen(false);
            } else {
                console.error('Failed to add follow-up:', data.message);
            }
        } catch (error) {
            console.error('Error adding follow-up:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !currentLead) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-2xl font-bold text-gray-900">{currentLead.companyName}</h2>
                        <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentLead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                currentLead.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                    currentLead.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                        currentLead.status === 'closed' ? 'bg-red-100 text-red-800' :
                                            'bg-purple-100 text-purple-800'
                                }`}>
                                {currentLead.status}
                            </span>
                            {currentLead.statusCategory && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                    {currentLead.statusCategory}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            <Edit3 size={16} className="mr-1" />
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="p-6">
                        {/* Company Information */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                        <Building size={20} className="mr-2" />
                                        Company Information
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <Mail size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Email:</span>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={formData.companyEmail || ''}
                                                    onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                />
                                            ) : (
                                                <span className="ml-2 font-medium">{currentLead.companyEmail || "No email"}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            <Phone size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Phone:</span>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={formData.contactNo || ''}
                                                    onChange={(e) => handleInputChange('contactNo', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                />
                                            ) : (
                                                <span className="ml-2 font-medium">{currentLead.contactNo || "No phone"}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            <MapPin size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Location:</span>
                                            <span className="ml-2 font-medium">
                                                {currentLead.state || "No state"}
                                                {currentLead.state && (
                                                    <span className="text-xs text-gray-500 ml-1">
                                                        🕐 {getStateCurrentTime(currentLead.state)}
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <Globe size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Website:</span>
                                            {isEditing ? (
                                                <input
                                                    type="url"
                                                    value={formData.companyWebsite || ''}
                                                    onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                />
                                            ) : (
                                                <span className="ml-2 font-medium">
                                                    {currentLead.companyWebsite ? (
                                                        <a
                                                            href={currentLead.companyWebsite.startsWith('http') ? currentLead.companyWebsite : `https://${currentLead.companyWebsite}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            {currentLead.companyWebsite}
                                                        </a>
                                                    ) : (
                                                        "No website"
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Person */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                        <User size={20} className="mr-2" />
                                        Contact Person
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <User size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Name:</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={formData.contactPerson || ''}
                                                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                />
                                            ) : (
                                                <span className="ml-2 font-medium">{currentLead.contactPerson || "No contact person"}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            <Mail size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Email:</span>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={formData.contactPersonEmail || ''}
                                                    onChange={(e) => handleInputChange('contactPersonEmail', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                />
                                            ) : (
                                                <span className="ml-2 font-medium">{currentLead.contactPersonEmail || "No email"}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            <Phone size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">Phone:</span>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={formData.contactPersonPhone || ''}
                                                    onChange={(e) => handleInputChange('contactPersonPhone', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                                />
                                            ) : (
                                                <span className="ml-2 font-medium">{currentLead.contactPersonPhone || "No phone"}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                {/* Status & Actions */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                        <Clock size={20} className="mr-2" />
                                        Status & Actions
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status Category</label>
                                            <StatusDropdown
                                                onStatusSelect={handleStatusSelect}
                                                disabled={saving}
                                                currentCategory={currentLead.statusCategory}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Resolve Status</label>
                                            <span className="text-sm text-gray-600">{currentLead.resolveStatus || "Not set"}</span>
                                        </div>

                                        {/* <div className="flex space-x-2">
                                            <button
                                                onClick={() => setFollowUpModalOpen(true)}
                                                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                            >
                                                <Calendar size={16} className="mr-1" />
                                                Add Follow-up
                                            </button>
                                        </div> */}
                                    </div>
                                </div>

                                {/* Assignment Info */}
                                {/* <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Info</h3>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Assigned:</span>
                                            <span className="font-medium">{currentLead.assigned ? "Yes" : "No"}</span>
                                        </div>
                                        {currentLead.assignedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Assigned Date:</span>
                                                <span className="font-medium">{new Date(currentLead.assignedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {currentLead.domain && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Domain:</span>
                                                <span className="font-medium">{currentLead.domain}</span>
                                            </div>
                                        )}
                                    </div>
                                </div> */}

                                {/* Notes */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                        <MessageSquare size={20} className="mr-2" />
                                        Notes
                                    </h3>

                                    {isEditing ? (
                                        <textarea
                                            value={formData.notes || ''}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Add notes..."
                                        />
                                    ) : (
                                        <div className="space-y-2">
                                            {/* Direct notes */}
                                            {currentLead.notes && (
                                                <div className="text-sm text-gray-600">
                                                    {currentLead.notes}
                                                </div>
                                            )}

                                            {/* Notes from resolve history */}
                                            {currentLead.resolveHistory && currentLead.resolveHistory.length > 0 && (
                                                <div className="space-y-2">
                                                    {currentLead.resolveHistory.map((entry, index) => (
                                                        entry.notes && (
                                                            <div key={index} className="bg-white p-2 rounded border-l-4 border-blue-500">
                                                                <div className="text-xs text-gray-500 mb-1">
                                                                    {new Date(entry.date).toLocaleString()} - {entry.statusCategory}
                                                                </div>
                                                                <div className="text-sm text-gray-700">
                                                                    {entry.notes}
                                                                </div>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            )}

                                            {/* Notes from follow-ups */}
                                            {currentLead.nextFollowUp && Array.isArray(currentLead.nextFollowUp) && currentLead.nextFollowUp.length > 0 && (
                                                <div className="space-y-2">
                                                    {currentLead.nextFollowUp.map((followUp, index) => (
                                                        followUp.notes && (
                                                            <div key={index} className="bg-white p-2 rounded border-l-4 border-green-500">
                                                                <div className="text-xs text-gray-500 mb-1">
                                                                    Follow-up - {new Date(followUp.date).toLocaleString()}
                                                                </div>
                                                                <div className="text-sm text-gray-700">
                                                                    {followUp.notes}
                                                                </div>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            )}

                                            {!currentLead.notes &&
                                                (!currentLead.resolveHistory || currentLead.resolveHistory.length === 0 || !currentLead.resolveHistory.some(e => e.notes)) &&
                                                (!currentLead.nextFollowUp || !Array.isArray(currentLead.nextFollowUp) || currentLead.nextFollowUp.length === 0 || !currentLead.nextFollowUp.some(f => f.notes)) && (
                                                    <p className="text-sm text-gray-600">No notes available</p>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Follow-ups */}
                        {currentLead.nextFollowUp && Array.isArray(currentLead.nextFollowUp) && currentLead.nextFollowUp.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <Calendar size={20} className="mr-2" />
                                        Follow-ups
                                    </h3>
                                    {Array.isArray(currentLead.nextFollowUp) && currentLead.nextFollowUp.length > 3 && (
                                        <button
                                            onClick={() => setShowAllFollowUps(!showAllFollowUps)}
                                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            {showAllFollowUps ? (
                                                <>
                                                    <ChevronUp size={16} className="mr-1" />
                                                    Show Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={16} className="mr-1" />
                                                    Show All ({currentLead.nextFollowUp.length})
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {(showAllFollowUps ? currentLead.nextFollowUp : currentLead.nextFollowUp.slice(0, 3)).map((followUp, index) => (
                                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {new Date(followUp.date).toLocaleDateString()} at {new Date(followUp.date).toLocaleTimeString()}
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Contact: {followUp.contact_type.join(', ')}
                                                    </div>
                                                    {followUp.notes && (
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            {followUp.notes}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${followUp.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    followUp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {followUp.status || 'scheduled'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resolve History */}
                        {currentLead.resolveHistory && currentLead.resolveHistory.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Resolve History</h3>
                                <ResolveHistory history={currentLead.resolveHistory} />
                            </div>
                        )}

                        {/* Email History */}
                        {currentLead.emails && currentLead.emails.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Email History</h3>
                                <EmailHistory emails={currentLead.emails} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                {isEditing && (
                    <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save size={16} className="mr-1" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {followUpModalOpen && (
                <FollowUpModal
                    isOpen={followUpModalOpen}
                    onClose={() => setFollowUpModalOpen(false)}
                    onSubmit={handleFollowUpSubmit}
                    currentLead={currentLead}
                    session={null}
                />
            )}

            {statusUpdateModalOpen && selectedCategory && (
                <StatusUpdateModal
                    isOpen={statusUpdateModalOpen}
                    onClose={() => setStatusUpdateModalOpen(false)}
                    onSubmit={handleStatusUpdate}
                    category={selectedCategory}
                    resolveStatus={selectedResolveStatus}
                    currentLead={currentLead}
                    session={null}
                />
            )}
        </div>
    );
}
