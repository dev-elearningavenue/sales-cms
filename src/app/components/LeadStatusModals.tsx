import React from "react";
import { X } from "lucide-react";

type ContactType = "email" | "call" | "chat";

interface LeadStatusModalsProps {
  showConversionModal: boolean;
  showFollowUpModal: boolean;
  showNoteModal: boolean;
  pendingStatusChange: string | null;
  conversionValue?: number;
  setConversionValue: (value: number | undefined) => void;
  newNote: string;
  setNewNote: (note: string) => void;
  followUpDate: string;
  setFollowUpDate: (date: string) => void;
  contactTypes: ContactType[];
  toggleContactType: (type: ContactType) => void;
  followUpNote: string;
  setFollowUpNote: (note: string) => void;
  closeAllModals: () => void;
  applyStatusChange: () => void;
}

const LeadStatusModals: React.FC<LeadStatusModalsProps> = ({
  showConversionModal,
  showFollowUpModal,
  showNoteModal,
  pendingStatusChange,
  conversionValue,
  setConversionValue,
  newNote,
  setNewNote,
  followUpDate,
  setFollowUpDate,
  contactTypes,
  toggleContactType,
  followUpNote,
  setFollowUpNote,
  closeAllModals,
  applyStatusChange,
}) => {
  return (
    <>
      {/* Conversion Value Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Lead Converted
            </h2>
            <p className="text-gray-600 mb-4">
              Please enter the conversion value:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversion Value ($)
              </label>
              <input
                type="number"
                value={conversionValue || ""}
                onChange={(e) => setConversionValue(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add details about the conversion"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyStatusChange}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={!conversionValue}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow Up Modal with contact type checkboxes */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Schedule Follow Up
            </h2>
            <p className="text-gray-600 mb-4">
              Please set a date and contact methods for the follow up:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Method (select at least one)
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contact-email"
                    checked={contactTypes.includes("email")}
                    onChange={() => toggleContactType("email")}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="contact-email"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Email
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contact-call"
                    checked={contactTypes.includes("call")}
                    onChange={() => toggleContactType("call")}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="contact-call"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Phone Call
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contact-chat"
                    checked={contactTypes.includes("chat")}
                    onChange={() => toggleContactType("chat")}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="contact-chat"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Chat
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Notes
              </label>
              <textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add details about the follow up"
                rows={2}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Note (Optional)
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add additional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyStatusChange}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                disabled={!followUpDate || contactTypes.length === 0}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal for general status changes */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {pendingStatusChange === "Resolved"
                ? "Resolve Lead"
                : "Update Status"}
            </h2>
            <p className="text-gray-600 mb-4">
              {pendingStatusChange === "Resolved"
                ? "Add any final notes before resolving this lead:"
                : "Add a note about this status change (optional):"}
            </p>

            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add your notes here"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyStatusChange}
                className={`px-4 py-2 ${
                  pendingStatusChange === "Resolved"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"
                } text-white rounded-md`}
              >
                {pendingStatusChange === "Resolved"
                  ? "Resolve Lead"
                  : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadStatusModals;
