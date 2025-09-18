"use client";
import React, { useState } from "react";
import { X, Plus, Calendar, MessageSquare, User, Clock } from "lucide-react";

// Interface for comprehensive notes from all sources
interface ComprehensiveNote {
    id: string;
    text: string;
    date: Date;
    source: "direct" | "resolve_history" | "follow_up";
    sourceDetails?: {
        status?: string;
        statusCategory?: string;
        resolveStatus?: string;
        contactMethod?: string;
        emailSent?: boolean;
    };
}

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any; // Can be ILead or ICompanyLead
    leadType: "company" | "regular";
    onNoteAdded?: (note: string) => void;
}

const NotesModal: React.FC<NotesModalProps> = ({
    isOpen,
    onClose,
    lead,
    leadType,
    onNoteAdded
}) => {
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"notes" | "followups">("notes");

    if (!isOpen || !lead) return null;

    // Comprehensive notes extraction function
    const getAllNotes = (): ComprehensiveNote[] => {
        const allNotes: ComprehensiveNote[] = [];

        // 1. Direct notes field
        if (lead.notes) {
            if (typeof lead.notes === "string" && lead.notes.trim()) {
                // For string notes, split by line breaks and parse timestamps
                const noteLines = lead.notes.split('\n\n').filter((line: string) => line.trim());
                noteLines.forEach((noteLine: string, index: number) => {
                    // Try to extract timestamp from format [timestamp] note
                    const timestampMatch = noteLine.match(/^\[(.*?)\]\s*(.*)$/);
                    if (timestampMatch) {
                        allNotes.push({
                            id: `direct-${index}`,
                            text: timestampMatch[2],
                            date: new Date(timestampMatch[1]),
                            source: "direct"
                        });
                    } else {
                        allNotes.push({
                            id: `direct-${index}`,
                            text: noteLine,
                            date: new Date(), // Fallback to current date
                            source: "direct"
                        });
                    }
                });
            } else if (Array.isArray(lead.notes)) {
                // For array notes
                lead.notes.forEach((note: any, index: number) => {
                    allNotes.push({
                        id: `direct-array-${index}`,
                        text: note.text || note.toString(),
                        date: new Date(note.created_at || note.date || Date.now()),
                        source: "direct"
                    });
                });
            }
        }

        // 2. Resolve History notes
        if (lead.resolveHistory && Array.isArray(lead.resolveHistory)) {
            lead.resolveHistory.forEach((entry: any, index: number) => {
                if (entry.notes && entry.notes.trim()) {
                    allNotes.push({
                        id: `resolve-${index}`,
                        text: entry.notes,
                        date: new Date(entry.time || entry.date || Date.now()),
                        source: "resolve_history",
                        sourceDetails: {
                            status: entry.status,
                            statusCategory: entry.statusCategory,
                            resolveStatus: entry.resolveStatus,
                            emailSent: entry.emailSent
                        }
                    });
                }
            });
        }

        // 3. Follow-up notes
        if (lead.next_follow_up && Array.isArray(lead.next_follow_up)) {
            lead.next_follow_up.forEach((followUp: any, index: number) => {
                if (followUp.notes && followUp.notes.trim()) {
                    allNotes.push({
                        id: `followup-${index}`,
                        text: followUp.notes,
                        date: new Date(followUp.date || followUp.followUpDate || Date.now()),
                        source: "follow_up",
                        sourceDetails: {
                            contactMethod: followUp.contactMethod || (Array.isArray(followUp.contact_type) ? followUp.contact_type.join(", ") : followUp.contact_type)
                        }
                    });
                }
            });
        }

        // Sort by date (newest first)
        return allNotes.sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    // Get all follow-ups (existing functionality)
    const getAllFollowUps = () => {
        if (!lead.next_follow_up || !Array.isArray(lead.next_follow_up)) {
            return [];
        }
        return [...lead.next_follow_up].sort((a: any, b: any) =>
            new Date(b.date || b.followUpDate).getTime() - new Date(a.date || a.followUpDate).getTime()
        );
    };

    const comprehensiveNotes = getAllNotes();
    const followUps = getAllFollowUps();

    // Handle adding a new note
    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsSubmitting(true);

        try {
            if (onNoteAdded) {
                await onNoteAdded(newNote.trim());
            }
            setNewNote("");
            setIsAddingNote(false);
        } catch (error) {
            console.error("Error adding note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setNewNote("");
        setIsAddingNote(false);
    };

    // Get source label and color
    const getSourceInfo = (source: ComprehensiveNote["source"]) => {
        switch (source) {
            case "direct":
                return { label: "Direct Note", color: "bg-blue-100 text-blue-800" };
            case "resolve_history":
                return { label: "Status Update", color: "bg-green-100 text-green-800" };
            case "follow_up":
                return { label: "Follow-up", color: "bg-purple-100 text-purple-800" };
            default:
                return { label: "Note", color: "bg-gray-100 text-gray-800" };
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b p-4 text-black">
                    <h2 className="text-xl font-semibold">
                        {leadType === "company" ? `${lead.companyName}` : `${lead.free_signup?.full_name || lead.contact_us?.full_name || "Lead"}`} - Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b px-4">
                    <button
                        className={`py-3 px-2 text-sm font-medium ${activeTab === "notes"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-600 hover:text-gray-800"
                            }`}
                        onClick={() => setActiveTab("notes")}
                    >
                        All Notes ({comprehensiveNotes.length})
                    </button>
                    <button
                        className={`py-3 px-4 text-sm font-medium ${activeTab === "followups"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-600 hover:text-gray-800"
                            }`}
                        onClick={() => setActiveTab("followups")}
                    >
                        Follow-ups ({followUps.length})
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {activeTab === "notes" && (
                        <>
                            {/* Add Note Section */}
                            {isAddingNote ? (
                                <div className="mb-4 border-b pb-4">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        placeholder="Enter your note here..."
                                        rows={3}
                                    />
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddNote}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                            disabled={!newNote.trim() || isSubmitting}
                                        >
                                            {isSubmitting ? "Adding..." : "Add Note"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingNote(true)}
                                    className="flex items-center gap-2 text-blue-600 mb-4 px-4 py-2 border border-blue-300 rounded-md hover:bg-blue-50"
                                >
                                    <Plus size={16} />
                                    Add New Note
                                </button>
                            )}

                            {/* Comprehensive Notes List */}
                            {comprehensiveNotes.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No notes found for this lead.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {comprehensiveNotes.map((note) => {
                                        const sourceInfo = getSourceInfo(note.source);
                                        return (
                                            <div
                                                key={note.id}
                                                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                            >
                                                {/* Note Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${sourceInfo.color}`}>
                                                            {sourceInfo.label}
                                                        </span>
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <Clock size={12} className="mr-1" />
                                                            {note.date.toLocaleDateString()} {note.date.toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Note Content */}
                                                <div className="text-sm text-gray-900 mb-3 whitespace-pre-wrap">
                                                    {note.text}
                                                </div>

                                                {/* Source Details */}
                                                {note.sourceDetails && (
                                                    <div className="border-t pt-3 mt-3">
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {note.sourceDetails.statusCategory && (
                                                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                                    {note.sourceDetails.statusCategory}
                                                                </span>
                                                            )}
                                                            {note.sourceDetails.resolveStatus && (
                                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                    {note.sourceDetails.resolveStatus}
                                                                </span>
                                                            )}
                                                            {note.sourceDetails.contactMethod && (
                                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                    {note.sourceDetails.contactMethod}
                                                                </span>
                                                            )}
                                                            {note.sourceDetails.emailSent && (
                                                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                                    Email Sent
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === "followups" && (
                        <>
                            {followUps.length === 0 ? (
                                <div className="text-center py-8">
                                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No follow-ups scheduled for this lead.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {followUps.map((followUp: any, index: number) => (
                                        <div
                                            key={index}
                                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                        >
                                            <div className="flex items-center text-sm text-gray-700 mb-3">
                                                <Calendar size={16} className="mr-2" />
                                                <span className="font-medium">
                                                    {new Date(followUp.date || followUp.followUpDate).toLocaleDateString()} {' '}
                                                    {new Date(followUp.date || followUp.followUpDate).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            {followUp.contactMethod && (
                                                <div className="flex items-center text-sm text-gray-600 mb-2">
                                                    <span className="font-medium mr-2">Contact Method:</span>
                                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                        {followUp.contactMethod}
                                                    </span>
                                                </div>
                                            )}

                                            {followUp.notes && (
                                                <div className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                                                    <p className="font-medium text-xs text-gray-500 mb-1">
                                                        Notes:
                                                    </p>
                                                    <p className="whitespace-pre-wrap">{followUp.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesModal;
