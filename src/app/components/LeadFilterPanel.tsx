import React from "react";
import { ILead } from "@/types/leads";

interface LeadFilterPanelProps {
  filters: {
    domain: string;
    category: string;
    status: string;
    followUpDate: string;
  };
  handleFilterChange: (filterType: string, value: string) => void;
  getStatusOptionsForCategory: (category: string, lead?: ILead) => string[];
}

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const LeadFilterPanel: React.FC<LeadFilterPanelProps> = ({
  filters,
  handleFilterChange,
  getStatusOptionsForCategory,
}) => {
  const today = getTodayString();

  return (
    <div className="lead-filter-panel bg-gray-50 p-4 rounded-md mb-4 border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-normal text-gray-700 mb-1">
          Domain
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters.domain}
          onChange={(e) => handleFilterChange("domain", e.target.value)}
        >
          <option value="">All Domains</option>
          <option value="OOR">Osha Outreach</option>
          <option value="OOC">Osha Online Center</option>
          <option value="OES">Osha Education School</option>
          <option value="FOC">Free Osha Courses</option>
          <option value="30Construction">Osha 30 Construction</option>
          <option value="Osha360">Osha 360</option>
          <option value="EHSS">EHS School</option>
          <option value="OP">Osha Practice</option>
          <option value="NY30">NY Osha 30</option>
          <option value="EHSP">EHS Practice</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Order Creation">Order Creation</option>
          <option value="Abandoned Cart">Abandoned Cart</option>
          <option value="Free SignUp">Free SignUp</option>
          <option value="Free Study Guide">Free Study Guide</option>
          <option value="Custom Lead">Custom Lead</option>
          <option value="Contact Us">Contact Us</option>
          <option value="Scholarship">Scholarship</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">All Status</option>
          {getStatusOptionsForCategory(filters.category).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Follow-Up Date
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              handleFilterChange(
                "followUpDate",
                filters.followUpDate === today ? "" : today
              )
            }
            className={`px-3 py-2 text-sm rounded-md border transition-colors whitespace-nowrap ${
              filters.followUpDate === today
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Today
          </button>
          <input
            type="date"
            className="flex-1 min-w-0 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.followUpDate}
            onChange={(e) => handleFilterChange("followUpDate", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default LeadFilterPanel;
