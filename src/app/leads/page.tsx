// src/app/leads/page.tsx
"use client";
import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import LeadsTable from "@/components/LeadsTable";
import Head from "next/head";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";

// interface Lead {
//   _id: string;
//   category: string;
//   createdAt: string;
//   domain: string;
//   assigned_to?: string;
//   assigned?: Boolean;
//   created_by?: string;
// }

const Leads = () => {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useApp();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        // console.log("Leads: ", data);
        if (!Array.isArray(data.leads)) {
          console.error(data);
          setLeads([]);
          return;
        }
        setLeads(data.leads);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const handleAssign = async (leadId: string) => {
    try {
      console.log(`Assigning Lead: ${leadId}`);
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (res.ok) {
        alert("Lead assigned successfully!");
        setLeads((prevLeads) =>
          prevLeads.filter((lead) => lead._id !== leadId)
        );
      } else {
        alert("Failed to assign lead.");
      }
    } catch (error) {
      console.error("Error while assigning lead:", error);
      alert("An error occurred while assigning the lead.");
    }
  };

  return (
    <>
      <Head>
        <title>All Leads | Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent ..."></div>
            Fetching the Results..
          </div>
        ) : (
          <LeadsTable leads={leads} onAssign={handleAssign} title="ALL LEADS" />
        )}
      </div>
    </>
  );

  /*
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">All Leads</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Domain</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Created At</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="text-center col-span-4">
                <LoadingSkeleton />
              </td>
            </tr>
          ) : (
            leads?.map((lead) => (
              <tr key={lead._id} className="text-center border-b">
                <td className="border p-2">{lead.domain}</td>
                <td className="border p-2">{lead.category}</td>
                <td className="border p-2">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="border p-2">
                  {lead.assigned ? (
                    <span>Assigned</span> // Show "Assigned" if the lead is already assigned
                  ) : (
                    <button
                      onClick={() => handleAssign(lead._id)}
                      className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Assign Me
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
  */
};

export default Leads;
