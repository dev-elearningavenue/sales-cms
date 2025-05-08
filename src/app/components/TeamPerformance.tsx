import { PieChart } from "lucide-react";
import { TeamMemberCard } from "./TeamMemberCard";
import { ApiResponse } from "@/types/apiResponse";

interface TeamPerformanceProps {
  data: ApiResponse;
  darkMode: boolean;
}

export const TeamPerformance = ({ data, darkMode }: TeamPerformanceProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Performance</h2>
        <div className="flex items-center space-x-2">
          <PieChart
            className={`h-5 w-5 ${
              darkMode ? "text-gray-300" : "text-gray-500"
            }`}
          />
          <span
            className={`text-sm ${
              darkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Sales Performance
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.salesPeople && data.salesPeople.length > 0 ? (
          data.salesPeople.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              darkMode={darkMode}
            />
          ))
        ) : (
          <p className={darkMode ? "text-gray-300" : "text-gray-500"}>
            No salespeople data available
          </p>
        )}
      </div>
    </div>
  );
};
