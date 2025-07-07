import React from "react";
import { X } from "lucide-react";

type ContactType = "email" | "call" | "chat";

interface LeadStatusModalsProps {
  showConversionModal: boolean;
  showFollowUpModal: boolean;
  showNoteModal: boolean;
  showLvmModal: boolean;
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
  lvmEmailData: {
    from: string;
    to: string;
    cc: string;
    subject: string;
    body: string;
  };
  setLvmEmailData: (data: {
    from: string;
    to: string;
    cc: string;
    subject: string;
    body: string;
  }) => void;
  closeAllModals: () => void;
  applyStatusChange: () => void;
  sendLvmEmail: () => void;
}

const LeadStatusModals: React.FC<LeadStatusModalsProps> = ({
  showConversionModal,
  showFollowUpModal,
  showNoteModal,
  showLvmModal,
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
  lvmEmailData,
  setLvmEmailData,
  closeAllModals,
  applyStatusChange,
  sendLvmEmail,
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
            {/* <p className="text-gray-600 mb-4">
              Please set a date and contact methods for the follow up:
            </p> */}

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

            {/* <div className="mb-4">
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
            </div> */}

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

      {/* LVM Email Modal */}
      {showLvmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Send LVM Email
            </h2>
            <p className="text-gray-600 mb-4">
              Compose an email to follow up with this lead:
            </p>

            <div className="space-y-4">
              {/* From Field (disabled) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From: <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={lvmEmailData.from}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder="Domain email will appear here"
                />
                {!lvmEmailData.from && (
                  <p className="text-sm text-red-500 mt-1">
                    No email configuration found for this domain
                  </p>
                )}
              </div>

              {/* To Field (disabled) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To: <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={lvmEmailData.to}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder="Lead email will appear here"
                />
                {!lvmEmailData.to && (
                  <p className="text-sm text-red-500 mt-1">
                    No email address found for this lead
                  </p>
                )}
              </div>

              {/* CC Field */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CC: (Optional)
                </label>
                <input
                  type="email"
                  value={lvmEmailData.cc}
                  onChange={(e) =>
                    setLvmEmailData({ ...lvmEmailData, cc: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional email addresses (comma separated)"
                />
              </div> */}

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lvmEmailData.subject}
                  onChange={(e) =>
                    setLvmEmailData({
                      ...lvmEmailData,
                      subject: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email subject"
                  required
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body: <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={lvmEmailData.body}
                  onChange={(e) =>
                    setLvmEmailData({ ...lvmEmailData, body: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Compose your email message here..."
                  rows={10}
                  required
                />
              </div>

              {/* Additional Note */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Note (Optional)
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add internal notes about this LVM action"
                  rows={2}
                />
              </div> */}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendLvmEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={
                  !lvmEmailData.to ||
                  !lvmEmailData.subject ||
                  !lvmEmailData.body
                }
              >
                Send Email & Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadStatusModals;
