import { X } from "lucide-react";
import dynamic from "next/dynamic";
import MyLeadsModal from "@/types/myLeadsModals";
// Dynamically import CKEditor to avoid SSR issues
const CKEditorWrapper = dynamic(
  () => import("@/app/components/CKEditorWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 text-gray-700 rounded-md p-4 min-h-[150px] bg-gray-50 animate-pulse">
        Loading editor...
      </div>
    ),
  }
);

// Helper to check if HTML content has actual text
const hasActualContent = (htmlString: string): boolean => {
  if (!htmlString) return false;
  // Create a temporary div to extract text content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString;
  const textContent = tempDiv.textContent || tempDiv.innerText || "";
  return textContent.trim().length > 0;
};

const LeadStatusModals: React.FC<MyLeadsModal> = ({
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
  applyFollowUpWithEmail,
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
                Order ID
              </label>
              <input
                type="text"
                value={conversionValue || ""}
                // onChange={(e) => setConversionValue(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Order Id"
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
                className="w-full p-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div
            className={`bg-white rounded-lg shadow-xl p-6 w-full mx-4 max-h-[90vh] overflow-y-auto ${
              contactTypes.includes("email") ? "max-w-4xl" : "max-w-md"
            }`}
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Schedule Follow Up
            </h2>
            {/* <p className="text-gray-600 mb-4">
              Please set a date and contact methods for the follow up:
            </p> */}

            <div
              className={`mb-4 gap-4 ${
                contactTypes.includes("email")
                  ? "flex flex-row items-end"
                  : "flex flex-col"
              }`}
            >
              <div
                className={contactTypes.includes("email") ? "w-1/2" : "w-full"}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow Up Date
                  <span className="px-1 text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div
                className={contactTypes.includes("email") ? "w-1/2" : "w-full"}
              >
                <label
                  className={`block text-sm font-medium text-gray-700 mb-2  ${
                    contactTypes.includes("email") ? "px-4" : ""
                  }`}
                >
                  Contact Method (select at least one)
                  <span className="px-1 text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center space-x-6 ${
                    contactTypes.includes("email") ? "h-11 p-4" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="contact-email"
                      checked={contactTypes.includes("email")}
                      disabled
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
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Notes
              </label>
              <textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                placeholder="Add details about the follow up"
                rows={2}
              />
            </div>

            {/* Email Fields - Show only when Email is selected as contact method */}
            {contactTypes.includes("email") && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-3">
                  Email Details
                </h3>

                {/* From and To Fields in a single row */}
                <div className="mb-3 flex flex-row gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From:
                    </label>
                    <input
                      type="email"
                      value={lvmEmailData.from}
                      disabled
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                      placeholder="Domain email will appear here"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To:
                    </label>
                    <input
                      type="email"
                      value={lvmEmailData.to}
                      // disabled={!!lvmEmailData.to}
                      onChange={(e) =>
                        setLvmEmailData({ ...lvmEmailData, to: e.target.value })
                      }
                      className={`w-full p-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 cursor-text`}
                      placeholder="Only PASTE the Email Address"
                    />
                  </div>
                </div>

                {/* Subject Field */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Email subject"
                    required
                  />
                </div>

                {/* Email Body */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Message: <span className="text-red-500">*</span>
                  </label>
                  <div className="text-gray-700">
                    <CKEditorWrapper
                      value={lvmEmailData.body}
                      onChange={(data: string) =>
                        setLvmEmailData({ ...lvmEmailData, body: data })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

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
                onClick={applyFollowUpWithEmail}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                disabled={
                  !followUpDate ||
                  contactTypes.length === 0 ||
                  (contactTypes.includes("email") &&
                    (!lvmEmailData.subject ||
                      !hasActualContent(lvmEmailData.body)))
                }
              >
                {contactTypes.includes("email")
                  ? "Schedule & Send Email"
                  : "Schedule"}
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
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
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
                  // disabled={!!lvmEmailData.to}
                  onChange={(e) =>
                    setLvmEmailData({ ...lvmEmailData, to: e.target.value })
                  }
                  className={`w-full p-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 cursor-text`}
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
                  className="w-full p-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email subject"
                  required
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body: <span className="text-red-500">*</span>
                </label>
                <div className="text-gray-700">
                  <CKEditorWrapper
                    value={lvmEmailData.body}
                    onChange={(data: string) =>
                      setLvmEmailData({ ...lvmEmailData, body: data })
                    }
                  />
                </div>
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
                  !hasActualContent(lvmEmailData.body)
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
// function useState(arg0: boolean): [any, any] {
//   throw new Error("Function not implemented.");
// }
