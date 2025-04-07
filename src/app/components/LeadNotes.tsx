import React from "react";
import { ILead } from "@/types/leads";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "@/components/Dialog";
import { X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LeadNotesProps {
  lead: ILead;
  isOpen: boolean;
  onClose: () => void;
}

const LeadNotes: React.FC<LeadNotesProps> = ({ lead, isOpen, onClose }) => {
  if (!lead.notes || !Array.isArray(lead.notes) || lead.notes.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white rounded-lg shadow-lg max-w-md mx-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                Lead Notes
              </DialogTitle>
              <DialogClose onClick={onClose} />
            </div>
          </DialogHeader>
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 mb-2">No notes found for this lead.</p>
            <p className="text-sm text-gray-400">
              Add a note when changing the lead status.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Sort notes by creation date (newest first)
  const sortedNotes = [...lead.notes].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Lead Notes
            </DialogTitle>
            <DialogClose onClick={onClose} />
          </div>
        </DialogHeader>
        <div className="p-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadNotes;
