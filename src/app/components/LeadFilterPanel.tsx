import React from "react";
import { ILead } from "@/types/leads";

interface LeadFilterPanelProps {
  filters: {
    domain: string;
    category: string;
    status: string;
  };
  handleFilterChange: (filterType: string, value: string) => void;
  getStatusOptionsForCategory: (category: string, lead?: ILead) => string[];
}

const LeadFilterPanel: React.FC<LeadFilterPanelProps> = ({
  filters,
  handleFilterChange,
  getStatusOptionsForCategory,
}) => {
  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
};

export default LeadFilterPanel;
