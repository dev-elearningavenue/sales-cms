import React, { useState, useEffect } from "react";

interface CompanyLeadFiltersProps {
    filters: {
        status: string;
        state: string;
        domain: string;
        assignedTo: string;
        search: string;
    };
    onFilterChange: (filters: any) => void;
}

const CompanyLeadFilters: React.FC<CompanyLeadFiltersProps> = ({
    filters,
    onFilterChange,
}) => {
    const [users, setUsers] = useState<any[]>([]);
    const [states, setStates] = useState<string[]>([]);

    // Fetch users for assignment filter
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch("/api/users");
                const data = await response.json();
                if (data.success) {
                    setUsers(data.users);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();
    }, []);

    // Fetch states for state filter
    useEffect(() => {
        const fetchStates = async () => {
            try {
                const response = await fetch("/api/company-leads/stats");
                const data = await response.json();
                if (data.success) {
                    setStates(Object.keys(data.stats.byState));
                }
            } catch (error) {
                console.error("Error fetching states:", error);
            }
        };

        fetchStates();
    }, []);

    const handleFilterChange = (key: string, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFilterChange({
            status: "",
            state: "",
            domain: "",
            assignedTo: "",
            search: "",
        });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Search */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search
                    </label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        placeholder="Company, email, phone..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>

                {/* State */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                    </label>
                    <select
                        value={filters.state}
                        onChange={(e) => handleFilterChange("state", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All States</option>
                        {states.map((state) => (
                            <option key={state} value={state}>
                                {state}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Domain */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Domain
                    </label>
                    <select
                        value={filters.domain}
                        onChange={(e) => handleFilterChange("domain", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Domains</option>
                        <option value="OOR">OOR</option>
                        <option value="OOC">OOC</option>
                        <option value="OES">OES</option>
                        <option value="FOC">FOC</option>
                    </select>
                </div>

                {/* Assigned To */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assigned To
                    </label>
                    <select
                        value={filters.assignedTo}
                        onChange={(e) => handleFilterChange("assignedTo", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Users</option>
                        <option value="unassigned">Unassigned</option>
                        {users.map((user) => (
                            <option key={user._id} value={user._id}>
                                {user.firstName} {user.lastName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                    <button
                        onClick={clearFilters}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompanyLeadFilters;
