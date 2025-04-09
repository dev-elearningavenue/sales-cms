import React, { useState } from "react";
import { ILead } from "@/types/leads";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "@/components/Dialog";
import { X, Plus, Calendar, Phone, Mail, MessageCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useApp } from "@/contexts/AppContext";

interface LeadDetailsProps {
  lead: ILead;
  isOpen: boolean;
  onClose: () => void;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, isOpen, onClose }) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "followups">("notes");
  const { addNotification } = useApp();

  // Handle adding a note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);

    try {
      // Send the note to the API
      const response = await fetch("/api/my-leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead._id,
          note: newNote.trim(),
          // Keep the current status
          newStatus: lead.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      // Optimistically update the UI
      const newNoteObj = {
        text: newNote,
        created_at: new Date().toISOString(),
      };

      if (!lead.notes) {
        lead.notes = [newNoteObj as any];
      } else {
        lead.notes = [newNoteObj as any, ...lead.notes];
      }

      // Reset the form
      setNewNote("");
      setIsAddingNote(false);

      // Notify the user
      addNotification({
        message: "Note added successfully",
        type: "info",
        read: false,
      });
    } catch (error) {
      console.error("Error adding note:", error);
      addNotification({
        message: "Failed to add note",
        type: "warning",
        read: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewNote("");
    setIsAddingNote(false);
  };

  // Format dates for display
  const formatDate = (dateString: string | Date) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Get icon for contact type
  const getContactTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail size={14} className="mr-1" />;
      case "call":
        return <Phone size={14} className="mr-1" />;
      case "chat":
        return <MessageCircle size={14} className="mr-1" />;
      default:
        return null;
    }
  };

  // Check if follow-ups exist
  const hasFollowUps =
    lead.next_follow_up &&
    Array.isArray(lead.next_follow_up) &&
    lead.next_follow_up.length > 0;

  // Check if notes exist
  const hasNotes =
    lead.notes && Array.isArray(lead.notes) && lead.notes.length > 0;

  // Sort follow-ups by date (newest first)
  const sortedFollowUps =
    hasFollowUps && lead.next_follow_up
      ? [...lead.next_follow_up].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      : [];

  // Sort notes by creation date (newest first)
  const sortedNotes =
    hasNotes && lead.notes
      ? [...lead.notes].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-lg shadow-lg max-w-lg mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Lead Details
            </DialogTitle>
            <DialogClose onClick={onClose} />
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "notes"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("notes")}
          >
            Notes {hasNotes && lead.notes ? `(${lead.notes.length})` : ""}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "followups"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("followups")}
          >
            Follow-ups{" "}
            {hasFollowUps && lead.next_follow_up
              ? `(${lead.next_follow_up.length})`
              : ""}
          </button>
        </div>

        <div className="p-6">
          {activeTab === "notes" && (
            <>
              {isAddingNote ? (
                <div className="mb-4 border-b pb-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your note here..."
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 text-gray-600 border border-gray-300 rounded-md"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNote}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md"
                      disabled={!newNote.trim() || isSubmitting}
                    >
                      {isSubmitting ? "Adding..." : "Add Note"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="flex items-center gap-1 text-blue-600 mb-4 px-3 py-1 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  <Plus size={16} className="mr-1" />
                  Add Note
                </button>
              )}

              {!hasNotes ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No notes found for this lead.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedNotes.map((note, index) => (
                    <div
                      key={index}
                      className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                    >
                      <p className="text-sm text-gray-800 mb-1">{note.text}</p>
                      <p className="text-xs text-gray-500">
                        {note.created_at
                          ? formatDistanceToNow(new Date(note.created_at), {
                              addSuffix: true,
                            })
                          : "Unknown date"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "followups" && (
            <>
              {!hasFollowUps ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">
                    No follow-ups scheduled for this lead.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedFollowUps.map((followUp, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-md p-4 bg-gray-50"
                    >
                      <div className="flex items-center text-sm text-gray-700 mb-3">
                        <Calendar size={16} className="mr-2" />
                        <span className="font-medium">
                          {formatDate(followUp.date)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {Array.isArray(followUp.contact_type) &&
                          followUp.contact_type.map(
                            (type: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                              >
                                {getContactTypeIcon(type)}
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </span>
                            )
                          )}
                      </div>

                      {followUp.notes && (
                        <div className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                          <p className="font-medium text-xs text-gray-500 mb-1">
                            Notes:
                          </p>
                          <p>{followUp.notes}</p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        Follow-up #
                        {lead.next_follow_up
                          ? lead.next_follow_up.length - index
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetails;
