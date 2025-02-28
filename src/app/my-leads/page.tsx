//src/app/my-leads/page.tsx

"use client";
import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";

const MyLeads = () => {
  const [userLeads, setUserLeads] = useState<ILead[]>([]);
  const { session, fetchSession } = useApp();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("createdAt");

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    const fetchUserLeads = async () => {
      try {
        if (!session?._id) return;
        // const res = await fetch("/api/my-leads");
        const res = await fetch(`/api/my-leads?userId=${session?._id}`);
        const data = await res.json();

        if (!Array.isArray(data.leads)) {
          console.error(data);
          setUserLeads([]);
          return;
        }
        setUserLeads(data.leads);
        // console.log("My leads: ", data.leads);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserLeads();
  }, [session]);

  const sortedLeads = [...userLeads].sort((a, b) => {
    if (sort === "createdAt") {
      return (
        new Date(b.createdAt ? b.createdAt : "").getTime() -
        new Date(a.createdAt ? a.createdAt : "").getTime()
      );
    }
    if (sort === "category") {
      if (a?.category && b?.category)
        return a.category.localeCompare(b.category);
    }
    return 0;
  });

  // 🛠️ Handle filtering
  const filteredLeads = sortedLeads.filter((lead) =>
    filter ? lead.category === filter : true
  );

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/my-leads/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const updatedLead = await res.json();

      console.log("Updated successfully");
      setUserLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead._id === leadId ? { ...lead, status: updatedLead.status } : lead
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* 🔍 Filter & Sort Bar */}
      <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md mb-4">
        <select
          className="p-2 border rounded-md"
          onChange={(e) => setFilter(e.target.value)}
          value={filter}
        >
          <option value="">Domains</option>
          <option value="OOC">OOC</option>
          <option value="OES">OES</option>
          <option value="OOR">OOR</option>
        </select>

        <select
          className="p-2 border rounded-md"
          onChange={(e) => setFilter(e.target.value)}
          value={filter}
        >
          <option value="">All Categories</option>
          <option value="Order Creation">Order Creation</option>
          <option value="Abandoned Cart">Abandoned Cart</option>
          <option value="Free SignUp">Free SignUp</option>
          <option value="Free Study Guide">Free Study Guide</option>
          <option value="Contact Us Form">Contact Us</option>
          <option value="Scholarship">Scholarship</option>
          <option value="Custom Lead">Custom Lead</option>
        </select>

        <select
          className="p-2 border rounded-md"
          onChange={(e) => setSort(e.target.value)}
          value={sort}
        >
          <option value="createdAt">Sort by Date</option>
          <option value="category">Sort by Category</option>
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton component="my leads" />
      ) : (
        <div className="bg-white shadow-md rounded-md p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 border">Domain</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Created At</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead?._id as string} className="text-center">
                    <td className="p-2 border">{lead.domain}</td>
                    <td className="p-2 border">{lead.category}</td>
                    <td className="p-2 border">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="p-2 border">
                      <select
                        className="bg-blue-500 text-white px-3 py-1 rounded-md cursor-pointer"
                        value={lead.status}
                        onChange={(e) =>
                          handleStatusChange(
                            lead?._id as string,
                            e.target.value
                          )
                        }
                      >
                        {[
                          "Follow Up",
                          "Solved",
                          "Pending",
                          "Converted",
                          "Assigned Orders",
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-gray-500">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyLeads;
