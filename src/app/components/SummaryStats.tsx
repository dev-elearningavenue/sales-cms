import {
  Clock,
  CheckCircle,
  PhoneCall,
  Users,
  BarChart3,
  PieChart,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { CategoryCard } from "./CategoryCard";
import { ApiResponse } from "@/types/apiResponse";

interface SummaryStatsProps {
  data: ApiResponse;
  darkMode: boolean;
}

export const SummaryStats = ({ data, darkMode }: SummaryStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Column 1: 2 Stat Cards stacked */}
      <div className="space-y-5">
        <StatCard
          title="Total Assigned Leads"
          value={data?.totals.assigned || 0}
          icon={<Clock className="h-5 w-5 text-white" />}
          color="purple"
          percentChange={5.2}
          darkMode={darkMode}
        />
        <StatCard
          title="Total Solved Leads"
          value={data?.totals.solved || 0}
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          color="green"
          percentChange={3.7}
          darkMode={darkMode}
        />
      </div>

      {/* Column 2: 3 Category Cards stacked */}
      <div className="flex flex-col h-full space-y-3">
        <CategoryCard
          title="Order Creations"
          value={data?.totals.orderCreations || 0}
          icon={<Clock className="h-4 w-4 text-white" />}
          color="indigo"
          darkMode={darkMode}
        />
        <CategoryCard
          title="Abandoned Carts"
          value={data?.totals.abandonedCarts || 0}
          icon={<PhoneCall className="h-4 w-4 text-white" />}
          color="red"
          darkMode={darkMode}
        />
        <CategoryCard
          title="Contact Us"
          value={data?.totals.contactUs || 0}
          icon={<Users className="h-4 w-4 text-white" />}
          color="blue"
          darkMode={darkMode}
        />
      </div>

      {/* Column 3: 3 Category Cards stacked */}
      <div className="flex flex-col h-full space-y-3">
        <CategoryCard
          title="Free SignUps"
          value={data?.totals.freeSignups || 0}
          icon={<CheckCircle className="h-4 w-4 text-white" />}
          color="green"
          darkMode={darkMode}
        />
        <CategoryCard
          title="Study Guides"
          value={data?.totals.freeStudyGuides || 0}
          icon={<BarChart3 className="h-4 w-4 text-white" />}
          color="purple"
          darkMode={darkMode}
        />
        <CategoryCard
          title="Scholarship"
          value={data?.totals.scholarship || 0}
          icon={<PieChart className="h-4 w-4 text-white" />}
          color="yellow"
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};
