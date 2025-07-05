import React from "react";
import { X } from "lucide-react";
import { ILead } from "@/types/leads";

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ILead | null;
  categoryColors: Record<string, string>;
  getDomainLabel: (domain: string) => string;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  categoryColors,
  getDomainLabel,
}) => {
  if (!isOpen || !lead) return null;

  // Helper function to get lead name
  const getLeadName = (lead: ILead): string => {
    if (
      lead.contact_us &&
      typeof lead.contact_us === "object" &&
      (lead.contact_us as any).name
    ) {
      return (lead.contact_us as any).name;
    }

    const dataObjects = [
      lead.free_signup,
      lead.order_creation,
      lead.scholarship,
      lead.custom_lead,
      lead.abandoned_cart,
    ];

    for (const obj of dataObjects) {
      if (
        obj &&
        typeof obj === "object" &&
        "firstName" in obj &&
        "lastName" in obj
      ) {
        return `${(obj as any).firstName} ${
          (obj as any).lastName || ""
        }`.trim();
      }
    }

    return "No Data Available";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">Lead Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <p className="text-gray-900 font-medium">{getLeadName(lead)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div
                className={`py-1 px-2 inline-block rounded-lg font-medium text-white ${
                  categoryColors[lead?.category ?? " "] || "bg-gray-500"
                }`}
              >
                {lead?.category}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <p className="text-gray-900 font-medium">
                {lead.status || "Pending"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain
              </label>
              <p className="text-gray-900 font-medium">
                {getDomainLabel(lead.domain || "")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Created
              </label>
              <p className="text-gray-900 font-medium">
                {lead.createdAt
                  ? new Date(lead.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Status
              </label>
              <p className="text-gray-900 font-medium">
                {lead.assigned
                  ? `Assigned to ${
                      lead.assigned_to && typeof lead.assigned_to === "object"
                        ? (lead.assigned_to as any).full_name || "Unknown User"
                        : "Unknown User"
                    }`
                  : "Not Assigned"}
              </p>
            </div>

            {/* Additional fields that might be useful */}
            {lead.resolve_status && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolve Status
                </label>
                <p className="text-gray-900 font-medium">
                  {lead.resolve_status}
                </p>
              </div>
            )}

            {lead.conversion_value && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conversion Value
                </label>
                <p className="text-gray-900 font-medium">
                  ${lead.conversion_value}
                </p>
              </div>
            )}
          </div>

          {/* Notes section if available */}
          {lead.notes && Array.isArray(lead.notes) && lead.notes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes ({lead.notes.length})
              </label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {lead.notes.slice(0, 3).map((note: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <p className="text-gray-800">{note.text}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {note.created_at
                        ? new Date(note.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                ))}
                {lead.notes.length > 3 && (
                  <p className="text-gray-500 text-sm italic">
                    +{lead.notes.length - 3} more notes...
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsModal;
