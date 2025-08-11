"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSkeleton } from "../../../components/LoadingSkeleton";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Calendar, User, Mail, Phone, Globe } from "lucide-react";
import { getDomainLabel, categoryColors } from "@/components/LeadUtils";
import { Customer, Field } from "@/components/Customer";
import CourseInfo from "@/components/CourseInfo";

interface LeadHistoryProps {
  params: {
    leadId: string;
  };
}

const LeadHistory = () => {
  const params = useParams();
  const router = useRouter();
  const { session, addNotification } = useApp();
  const [lead, setLead] = useState<ILead | null>(null);
  const [relatedLeads, setRelatedLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.leadId) {
      fetchLeadAndHistory(params.leadId as string);
    }
  }, [params.leadId]);

  const fetchLeadAndHistory = async (leadId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the specific lead first
      const leadResponse = await fetch(`/api/leads/${leadId}`);
      if (!leadResponse.ok) {
        throw new Error("Lead not found");
      }
      const leadData = await leadResponse.json();
      const currentLead = leadData.lead;

      if (!currentLead) {
        throw new Error("Lead not found");
      }

      setLead(currentLead);

      // Get email and domain from the lead (using direct fields)
      const email = currentLead.email;
      const domain = currentLead.domain;

      if (!email || !domain) {
        throw new Error("Lead email or domain not found");
      }

      // Fetch related leads with same domain and email
      const historyResponse = await fetch(`/api/leads/history?email=${encodeURIComponent(email)}&domain=${encodeURIComponent(domain)}`);
      if (!historyResponse.ok) {
        throw new Error("Failed to fetch lead history");
      }
      const historyData = await historyResponse.json();
      
      // Ensure current lead is included in related leads
      let allRelatedLeads = historyData.leads || [];
      
      // Check if current lead is already in the list
      const currentLeadExists = allRelatedLeads.some((relatedLead: ILead) => relatedLead._id === currentLead._id);
      
      // If current lead is not in the list, add it
      if (!currentLeadExists) {
        allRelatedLeads = [currentLead, ...allRelatedLeads];
      }
      
      // If no related leads found, at least show the current lead
      if (allRelatedLeads.length === 0) {
        allRelatedLeads = [currentLead];
      }
      
      setRelatedLeads(allRelatedLeads);

    } catch (error) {
      console.error("Error fetching lead history:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch lead history");
      addNotification({
        message: "Failed to fetch lead history",
        type: "warning",
        read: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const getLeadEmail = (lead: ILead): string => {
    // Use direct email field if available
    if (lead.email) {
      return lead.email;
    }
    
    // Fallback to populated fields if direct email not available
    if (
      lead.contact_us &&
      typeof lead.contact_us === "object" &&
      (lead.contact_us as any).email
    ) {
      return (lead.contact_us as any).email;
    }

    if (
      lead.free_signup &&
      typeof lead.free_signup === "object" &&
      (lead.free_signup as any).email
    ) {
      return (lead.free_signup as any).email;
    }

    if (
      lead.custom_lead &&
      typeof lead.custom_lead === "object" &&
      (lead.custom_lead as any).email
    ) {
      return (lead.custom_lead as any).email;
    }

    if (
      lead.scholarship &&
      typeof lead.scholarship === "object" &&
      (lead.scholarship as any).email
    ) {
      return (lead.scholarship as any).email;
    }

    if (
      lead.abandoned_cart &&
      typeof lead.abandoned_cart === "object" &&
      (lead.abandoned_cart as any).email
    ) {
      return (lead.abandoned_cart as any).email;
    }

    if (
      lead.order_creation &&
      typeof lead.order_creation === "object" &&
      (lead.order_creation as any).email
    ) {
      return (lead.order_creation as any).email;
    }

    return "";
  };

  const getLeadName = (lead: ILead): string => {
    // Use direct fullname field if available
    if (lead.fullname) {
      return lead.fullname;
    }
    
    // Fallback to populated fields if direct fullname not available
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
        return `${(obj as any).firstName} ${(obj as any).lastName || ""}`.trim();
      }
    }

    return "No Data Available";
  };

  if (loading) {
    return <LoadingSkeleton component="my leads" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Lead Not Found</h2>
              <p className="text-gray-600">The requested lead could not be found.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Leads
            </button>
          </div>

          {/* Main Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Lead History</h1>
            <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full"></div>
          </div>

          {/* Key Details */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Key Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <User className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-700 mb-1">Lead Name</h3>
                  <p className="text-lg font-bold text-gray-900">{getLeadName(lead)}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <Mail className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-700 mb-1">Email</h3>
                  <p className="text-lg font-bold text-gray-900">{getLeadEmail(lead)}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-700 mb-1">Domain</h3>
                  <p className="text-lg font-bold text-gray-900">{getDomainLabel(lead.domain || "")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* History Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">History Summary</h3>
            <div className="text-center">
              <p className="text-lg text-gray-700">
                Found <span className="font-bold text-2xl text-green-600">{Math.max(relatedLeads.length, 1)}</span> {Math.max(relatedLeads.length, 1) === 1 ? 'lead' : 'leads'} with the same email and domain combination
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Email: <span className="font-medium">{getLeadEmail(lead)}</span> | 
                Domain: <span className="font-medium">{getDomainLabel(lead.domain || "")}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Related Leads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Related Leads History</h2>
            <p className="text-gray-600 text-sm mt-1">All leads with the same email and domain</p>
          </div>

          {relatedLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium">No related leads found</p>
              <p className="text-sm">This lead has no history with the same email and domain combination.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {relatedLeads.map((relatedLead, index) => (
                <div key={relatedLead._id || index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`py-2 px-3 inline-block rounded-lg font-medium text-white text-sm ${
                            categoryColors[relatedLead?.category ?? " "] || "bg-gray-500"
                          }`}
                        >
                          {relatedLead?.category}
                        </div>
                        {relatedLead._id === lead._id && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
                            Current Lead
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {getLeadName(relatedLead)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Created:</span>
                          <span>
                            {relatedLead.createdAt
                              ? new Date(relatedLead.createdAt).toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <span className="font-medium">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            relatedLead.status === "Converted"
                              ? "bg-green-100 text-green-800"
                              : relatedLead.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {relatedLead.status || "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <span className="font-medium">Assigned:</span>
                          <span>
                            {relatedLead.assigned
                              ? relatedLead.assigned_to && typeof relatedLead.assigned_to === "object"
                                ? (relatedLead.assigned_to as any).full_name || "Unknown"
                                : "Yes"
                              : "No"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lead Details */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <Customer selectedLead={relatedLead} />
                    {(relatedLead?.category === "Order Creation" ||
                      relatedLead?.category === "Abandoned Cart" ||
                      relatedLead?.category === "Unpaid Training") && (
                      <CourseInfo selectedLead={relatedLead} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadHistory;
