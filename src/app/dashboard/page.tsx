// src/app/dashboard/page.tsx
"use client";
import { useApp } from "@/contexts/AppContext";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";

import {
  Users,
  CheckCircle,
  Clock,
  PhoneCall,
  XCircle,
  BarChart3,
  ChevronUp,
  PieChart,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SalesPerson } from "@/types/salesPerson";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  percentChange?: number;
  darkMode: boolean;
}

interface ProgressBarProps {
  value: number;
  colorClass: string;
}

interface TeamMemberCardProps {
  member: SalesPerson;
  darkMode: boolean;
}

// API response format
interface ApiResponse {
  salesPeople: SalesPerson[];
  totals: {
    assigned: number;
    contacted: number;
    solved: number;
    closed: number;
    orderCreations: number;
    abandonedCarts: number;
    contactUs: number;
    freeSignups: number;
    freeStudyGuides: number;
    scholarship: number;
  };
  lastUpdated: string;
  salesperson?: SalesPerson;
}

// Custom hook for dark mode
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDark);

    // Listen for changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return { darkMode, toggleDarkMode };
};

const useThemeFromContext = () => {
  // Access theme from context instead of managing locally
  const { theme, toggleTheme } = useApp();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    // No need for additional setup since your navbar already handles this
  }, []);

  return { darkMode: isDarkMode, toggleTheme };
};

// Custom hook for API data fetching
const useLeadsData = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Actual API call to get dashboard metrics
        const response = await fetch("/api/dashboard");
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to fetch dashboard data");
        }

        // Set the data from the API response
        setData(result.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch dashboard data");
      }

      setData(result.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to refresh data");
      setLoading(false);
    }
  };

  return { data, loading, error, refreshData };
};

const Card = ({
  children,
  className = "",
  darkMode = false,
  hover = true,
  flipContent = null,
  isSquarish = false,
}: {
  children: React.ReactNode;
  className?: string;
  darkMode?: boolean;
  hover?: boolean;
  flipContent?: React.ReactNode;
  isSquarish?: boolean;
}) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    if (flipContent) {
      setFlipped(!flipped);
    }
  };

  const baseClasses = `rounded-xl transition-all duration-300 perspective-1000 ${
    isSquarish ? "aspect-[4/3]" : ""
  } ${hover ? "hover:shadow-lg transform hover:-translate-y-1" : ""}`;
  const lightModeClasses = "bg-white shadow-sm border border-gray-100";
  const darkModeClasses =
    "bg-gray-800 shadow-md border border-gray-700 text-white";

  return (
    <div
      className={`${baseClasses} ${
        darkMode ? darkModeClasses : lightModeClasses
      } ${className} ${flipContent ? "cursor-pointer" : ""}`}
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ${
          flipped ? "rotate-y-180" : ""
        } preserve-3d`}
      >
        <div className="backface-hidden w-full h-full">{children}</div>

        {flipContent && (
          <div className="backface-hidden w-full h-full absolute top-0 left-0 rotate-y-180">
            {flipContent}
          </div>
        )}
      </div>
    </div>
  );
};

// Animated Statistic Card Component
const StatCard = ({
  title,
  value,
  icon,
  color,
  percentChange = 0,
  darkMode,
}: StatCardProps) => {
  const colorMapping = {
    purple: {
      background: darkMode
        ? "bg-purple-900"
        : "bg-gradient-to-br from-purple-400 to-indigo-500",
      text: darkMode ? "text-purple-300" : "text-white",
      icon: darkMode ? "bg-purple-700" : "bg-purple-700/80",
      gradient: "from-purple-500 to-indigo-600",
    },
    green: {
      background: darkMode
        ? "bg-green-900"
        : "bg-gradient-to-br from-green-400 to-emerald-500",
      text: darkMode ? "text-green-300" : "text-white",
      icon: darkMode ? "bg-green-700" : "bg-green-700/80",
      gradient: "from-green-400 to-emerald-500",
    },
    blue: {
      background: darkMode
        ? "bg-blue-900"
        : "bg-gradient-to-br from-blue-400 to-cyan-500",
      text: darkMode ? "text-blue-300" : "text-white",
      icon: darkMode ? "bg-blue-700" : "bg-blue-700/80",
      gradient: "from-blue-500 to-cyan-400",
    },
    red: {
      background: darkMode
        ? "bg-red-900"
        : "bg-gradient-to-br from-red-400 to-pink-500",
      text: darkMode ? "text-red-300" : "text-white",
      icon: darkMode ? "bg-red-700" : "bg-red-700/80",
      gradient: "from-red-500 to-pink-500",
    },
  };

  const colors = colorMapping[color as keyof typeof colorMapping];

  // Create flip side content with additional metrics
  const flipContent = (
    <div
      className={`p-6 flex flex-col h-full justify-center items-center ${colors.background}`}
    >
      <h3 className="text-lg font-semibold text-white mb-2">
        Additional Metrics
      </h3>
      <div className="flex flex-col items-center">
        <p className="text-sm text-white/80 mb-1">Conversion Rate</p>
        <p className="text-xl font-bold text-white">
          {Math.round(Math.random() * 40 + 60)}%
        </p>
      </div>
      <p className="text-xs text-white/70 mt-4">Click to flip back</p>
    </div>
  );

  return (
    <Card
      darkMode={darkMode}
      className={`p-4 flex flex-col overflow-hidden relative group ${colors.background}`}
      flipContent={flipContent}
      isSquarish={true}
    >
      <div className="absolute -right-6 -top-6 opacity-10 transform rotate-12 transition-transform group-hover:rotate-6 group-hover:scale-110">
        <div
          className={`text-white p-8 rounded-full bg-gradient-to-br ${colors.gradient}`}
        >
          {icon}
        </div>
      </div>
      <div className="flex justify-between items-start z-10">
        <h3 className="text-sm font-medium text-white/90">{title}</h3>
        <div className={`p-2 rounded-full ${colors.icon} shadow-sm`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold mt-2 ${colors.text}`}>
        {value.toLocaleString()}
      </p>

      {percentChange !== 0 && (
        <div
          className={`mt-2 flex items-center ${
            percentChange > 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {percentChange > 0 ? (
            <ArrowUpRight className="h-4 w-4 mr-1" />
          ) : (
            <ChevronUp className="h-4 w-4 mr-1 transform rotate-180" />
          )}
          <span className="text-sm font-medium">
            {Math.abs(percentChange)}%{" "}
            {percentChange > 0 ? "increase" : "decrease"}
          </span>
        </div>
      )}

      <p className="text-xs text-white/70 mt-4 absolute bottom-2 right-2">
        Click to see more
      </p>
    </Card>
  );
};

// Enhanced Progress Bar Component
const ProgressBar = ({ value, colorClass }: ProgressBarProps) => {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div
        className={`${colorClass} h-2.5 rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};

// Enhanced Team Member Card Component
const TeamMemberCard = ({ member, darkMode }: TeamMemberCardProps) => {
  // Check if this is the Admin card
  const isAdmin = member.id === "admin-combined";

  // Determine progress color based on value
  let progressColorClass = "bg-blue-600";
  if (member.progress >= 90) {
    progressColorClass = "bg-green-600";
  } else if (member.progress < 70) {
    progressColorClass = "bg-yellow-500";
  }

  // For Admin card, use a special color
  if (isAdmin) {
    progressColorClass = "bg-purple-600";
  }

  // Performance indicator
  const performanceIcon = () => {
    switch (member.performance) {
      case "increasing":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "decreasing":
        return (
          <ArrowUpRight className="h-4 w-4 text-red-500 transform rotate-90" />
        );
      default:
        return (
          <ArrowUpRight className="h-4 w-4 text-yellow-500 transform rotate-45" />
        );
    }
  };

  // Flip content with historical performance
  const flipContent = (
    <div className="p-6 h-full flex flex-col justify-between bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <h3 className="text-lg font-semibold mb-4">
        {member.name} - Performance History
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Last Month:</span>
          <span className="font-medium">
            {Math.round(member.progress * 0.9)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>This Quarter:</span>
          <span className="font-medium">
            {Math.round(member.progress * 1.05)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Year to Date:</span>
          <span className="font-medium">
            {Math.round(member.progress * 0.98)}%
          </span>
        </div>
      </div>
      <p className="text-xs text-white/70 mt-4">Click to flip back</p>
    </div>
  );

  // Special styling for Admin card
  const cardBackground = isAdmin
    ? darkMode
      ? "bg-gradient-to-br from-purple-900 to-indigo-900"
      : "bg-gradient-to-br from-purple-500 to-indigo-600"
    : darkMode
    ? "bg-gradient-to-br from-gray-800 to-gray-900"
    : "bg-gradient-to-br from-white to-gray-50";

  return (
    <Card
      darkMode={darkMode}
      className={`p-6 flex flex-col space-y-4 backdrop-blur-sm ${cardBackground}`}
      flipContent={flipContent}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className={`${
              isAdmin
                ? "bg-gradient-to-br from-purple-500 to-indigo-700"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
            } h-10 w-10 rounded-full flex items-center justify-center font-medium text-white`}
          >
            {member.avatar || member.name?.charAt(0)}
          </div>
          <h3
            className={`font-medium ${
              isAdmin && !darkMode ? "text-white" : ""
            }`}
          >
            {member.name}
            {isAdmin && (
              <span
                className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  darkMode
                    ? "bg-purple-700 text-white"
                    : "bg-purple-200 text-purple-800"
                }`}
              >
                Combined
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {performanceIcon()}
          <span
            className={`text-sm font-medium ${
              isAdmin
                ? darkMode
                  ? "text-purple-300"
                  : "text-white"
                : member.progress >= 90
                ? "text-green-500"
                : member.progress < 70
                ? "text-yellow-500"
                : "text-blue-600"
            }`}
          >
            {member.progress}%
          </span>
        </div>
      </div>

      {/* Counts - Assigned/Solved */}
      <div className="flex justify-between mt-1 mb-3">
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/70"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Assigned
          </span>
          <span
            className={`text-sm font-medium ${
              isAdmin && !darkMode ? "text-white" : ""
            }`}
          >
            {member.assigned}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/70"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Solved
          </span>
          <span
            className={`text-sm font-medium ${
              isAdmin && !darkMode ? "text-white" : ""
            }`}
          >
            {member.solved}
          </span>
        </div>
      </div>

      <ProgressBar value={member.progress} colorClass={progressColorClass} />

      <div className="grid grid-cols-3 gap-4 mt-4">
        {/* First row */}
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/80"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Order Creations
          </span>
          <div className="flex items-center mt-1 group">
            <Clock
              className={`h-4 w-4 mr-1 transition-colors ${
                isAdmin && !darkMode
                  ? "text-white/80"
                  : darkMode
                  ? "text-indigo-400"
                  : "text-indigo-600"
              } group-hover:text-indigo-500`}
            />
            <span
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {member.orderCreations}
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/80"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Abandoned Carts
          </span>
          <div className="flex items-center mt-1 group">
            <PhoneCall
              className={`h-4 w-4 mr-1 transition-colors ${
                isAdmin && !darkMode
                  ? "text-white/80"
                  : darkMode
                  ? "text-red-400"
                  : "text-red-600"
              } group-hover:text-red-500`}
            />
            <span
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {member.abandonedCarts}
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/80"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Contact Us
          </span>
          <div className="flex items-center mt-1 group">
            <Users
              className={`h-4 w-4 mr-1 transition-colors ${
                isAdmin && !darkMode
                  ? "text-white/80"
                  : darkMode
                  ? "text-blue-400"
                  : "text-blue-600"
              } group-hover:text-blue-500`}
            />
            <span
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {member.contactUs}
            </span>
          </div>
        </div>
        {/* Second row */}
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/80"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Free SignUps
          </span>
          <div className="flex items-center mt-1 group">
            <CheckCircle
              className={`h-4 w-4 mr-1 transition-colors ${
                isAdmin && !darkMode
                  ? "text-white/80"
                  : darkMode
                  ? "text-green-400"
                  : "text-green-600"
              } group-hover:text-green-500`}
            />
            <span
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {member.freeSignups}
            </span>
          </div>
        </div>
        {/* Free Study Guides */}
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/80"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Study Guides
          </span>
          <div className="flex items-center mt-1 group">
            <BarChart3
              className={`h-4 w-4 mr-1 transition-colors ${
                isAdmin && !darkMode
                  ? "text-white/80"
                  : darkMode
                  ? "text-purple-400"
                  : "text-purple-600"
              } group-hover:text-purple-500`}
            />
            <span
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {member.freeStudyGuides}
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xs ${
              isAdmin && !darkMode
                ? "text-white/80"
                : darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Scholarship
          </span>
          <div className="flex items-center mt-1 group">
            <PieChart
              className={`h-4 w-4 mr-1 transition-colors ${
                isAdmin && !darkMode
                  ? "text-white/80"
                  : darkMode
                  ? "text-yellow-400"
                  : "text-yellow-600"
              } group-hover:text-yellow-500`}
            />
            <span
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {member.scholarship}
            </span>
          </div>
        </div>
      </div>

      <p
        className={`text-xs ${
          isAdmin && !darkMode ? "text-white/70" : "text-gray-400"
        } text-center mt-2`}
      >
        Click for historical data
      </p>
    </Card>
  );
};

// Summary Stats Section for Admins/Managers
const SummaryStats = ({
  data,
  darkMode,
}: {
  data: ApiResponse;
  darkMode: boolean;
}) => {
  return (
    <div className="space-y-5">
      {/* First Row - 2 main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

      {/* Second Row - 6 category metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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

// Smaller Card for Category Stats
interface CategoryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  darkMode: boolean;
}

const CategoryCard = ({
  title,
  value,
  icon,
  color,
  darkMode,
}: CategoryCardProps) => {
  const colorMapping = {
    indigo: {
      background: darkMode
        ? "bg-indigo-900"
        : "bg-gradient-to-br from-indigo-400 to-indigo-500",
      text: darkMode ? "text-indigo-300" : "text-white",
      icon: darkMode ? "bg-indigo-700" : "bg-indigo-700/80",
    },
    red: {
      background: darkMode
        ? "bg-red-900"
        : "bg-gradient-to-br from-red-400 to-red-500",
      text: darkMode ? "text-red-300" : "text-white",
      icon: darkMode ? "bg-red-700" : "bg-red-700/80",
    },
    blue: {
      background: darkMode
        ? "bg-blue-900"
        : "bg-gradient-to-br from-blue-400 to-blue-500",
      text: darkMode ? "text-blue-300" : "text-white",
      icon: darkMode ? "bg-blue-700" : "bg-blue-700/80",
    },
    green: {
      background: darkMode
        ? "bg-green-900"
        : "bg-gradient-to-br from-green-400 to-green-500",
      text: darkMode ? "text-green-300" : "text-white",
      icon: darkMode ? "bg-green-700" : "bg-green-700/80",
    },
    purple: {
      background: darkMode
        ? "bg-purple-900"
        : "bg-gradient-to-br from-purple-400 to-purple-500",
      text: darkMode ? "text-purple-300" : "text-white",
      icon: darkMode ? "bg-purple-700" : "bg-purple-700/80",
    },
    yellow: {
      background: darkMode
        ? "bg-yellow-900"
        : "bg-gradient-to-br from-yellow-400 to-yellow-500",
      text: darkMode ? "text-yellow-300" : "text-white",
      icon: darkMode ? "bg-yellow-700" : "bg-yellow-700/80",
    },
  };

  const colors = colorMapping[color as keyof typeof colorMapping];

  return (
    <Card
      darkMode={darkMode}
      className={`p-3 flex flex-col overflow-hidden ${colors.background}`}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-medium text-white/90">{title}</h3>
        <div className={`p-1 rounded-full ${colors.icon} shadow-sm`}>
          {icon}
        </div>
      </div>
      <p className={`text-lg font-bold mt-1 ${colors.text}`}>
        {value.toLocaleString()}
      </p>
    </Card>
  );
};

// Team Performance Section for Admins/Managers
const TeamPerformance = ({
  data,
  darkMode,
}: {
  data: ApiResponse;
  darkMode: boolean;
}) => {
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

// Loading skeleton for dashboard cards
const DashboardSkeleton = ({ darkMode }: { darkMode: boolean }) => {
  return (
    <div className="space-y-8">
      {/* Summary Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`rounded-xl h-32 animate-pulse ${
              darkMode ? "bg-gray-800" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Team Performance Skeleton */}
      <div className="space-y-4">
        <div
          className={`h-8 w-64 rounded animate-pulse ${
            darkMode ? "bg-gray-800" : "bg-gray-200"
          }`}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-xl h-64 animate-pulse ${
                darkMode ? "bg-gray-800" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function DashboardPage() {
  const router = useRouter();
  const {
    session,
    fetchSession,
    error: sessionError,
    loading: sessionLoading,
  } = useApp();
  // const { darkMode, toggleDarkMode } = useDarkMode();
  const { darkMode } = useThemeFromContext();
  const {
    data,
    loading: dataLoading,
    error: dataError,
    refreshData,
  } = useLeadsData();

  // Combined loading state
  const isLoading = sessionLoading || dataLoading;

  useEffect(() => {
    // Check session status when component mounts
    if (!session && !isLoading) {
      console.log("No session in dashboard, fetching session");
      fetchSession();
    }
  }, [session, isLoading]);

  if (isLoading) {
    return <LoadingSkeleton component="page" />;
  }

  if (sessionError) {
    return <div>Session Error: {sessionError}</div>;
  }

  if (dataError) {
    return <div>Data Error: {dataError}</div>;
  }

  // If no session and not loading, redirect to login
  if (!session) {
    console.log("No session in dashboard.");
    router.replace("/login");
    return null;
  }

  // Set background based on dark mode
  const bgClass = darkMode
    ? "bg-gradient-to-br from-gray-900 to-gray-800 text-white"
    : "bg-gradient-to-br from-gray-50 to-white";

  // Sales Boy view
  if (session?.user_type === 3) {
    return (
      <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-semibold">
                Welcome, {session.full_name}
              </h1>
              <p className={darkMode ? "text-gray-300" : "text-gray-500"}>
                Leads Management Dashboard
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-4">
              <button
                onClick={refreshData}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>

              <Card
                darkMode={darkMode}
                className="px-4 py-2 flex items-center space-x-2"
              >
                <span
                  className={`text-sm font-medium ${
                    darkMode ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  Today: {new Date().toLocaleDateString()}
                </span>
              </Card>
            </div>
          </div>

          {/* Error Message */}
          {dataError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {dataError}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl h-32 animate-pulse ${
                    darkMode ? "bg-gray-800" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          ) : (
            /* Salesperson's stats */
            data?.salesperson && (
              <div className="space-y-5">
                {/* Main stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <StatCard
                    title="Your Assigned Leads"
                    value={data.salesperson.assigned}
                    icon={<Clock className="h-5 w-5 text-white" />}
                    color="purple"
                    darkMode={darkMode}
                  />
                  <StatCard
                    title="Your Solved Leads"
                    value={data.salesperson.solved}
                    icon={<CheckCircle className="h-5 w-5 text-white" />}
                    color="green"
                    darkMode={darkMode}
                  />
                </div>

                {/* Category stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <CategoryCard
                    title="Order Creations"
                    value={data.salesperson.orderCreations}
                    icon={<Clock className="h-4 w-4 text-white" />}
                    color="indigo"
                    darkMode={darkMode}
                  />
                  <CategoryCard
                    title="Abandoned Carts"
                    value={data.salesperson.abandonedCarts}
                    icon={<PhoneCall className="h-4 w-4 text-white" />}
                    color="red"
                    darkMode={darkMode}
                  />
                  <CategoryCard
                    title="Contact Us"
                    value={data.salesperson.contactUs}
                    icon={<Users className="h-4 w-4 text-white" />}
                    color="blue"
                    darkMode={darkMode}
                  />
                  <CategoryCard
                    title="Free SignUps"
                    value={data.salesperson.freeSignups}
                    icon={<CheckCircle className="h-4 w-4 text-white" />}
                    color="green"
                    darkMode={darkMode}
                  />
                  <CategoryCard
                    title="Study Guides"
                    value={data.salesperson.freeStudyGuides}
                    icon={<BarChart3 className="h-4 w-4 text-white" />}
                    color="purple"
                    darkMode={darkMode}
                  />
                  <CategoryCard
                    title="Scholarship"
                    value={data.salesperson.scholarship}
                    icon={<PieChart className="h-4 w-4 text-white" />}
                    color="yellow"
                    darkMode={darkMode}
                  />
                </div>
              </div>
            )
          )}

          {/* Last Updated Info */}
          <div className="text-center">
            <p
              className={`text-xs ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Last updated:{" "}
              {data?.lastUpdated
                ? new Date(data.lastUpdated).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Admin and Manager view
  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header with dark mode toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold">
              Welcome, {session.full_name || "Admin"}
            </h1>
            <p className={darkMode ? "text-gray-300" : "text-gray-500"}>
              Leads Management Dashboard
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            <button
              onClick={refreshData}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="text-sm">Refresh</span>
            </button>

            <Card
              darkMode={darkMode}
              className="px-4 py-2 flex items-center space-x-2"
            >
              <span
                className={`text-sm font-medium ${
                  darkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Today: {new Date().toLocaleDateString()}
              </span>
            </Card>
          </div>
        </div>

        {/* Error Message */}
        {dataError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {dataError}</span>
          </div>
        )}

        {/* Show loading skeleton or data */}
        {dataLoading ? (
          <DashboardSkeleton darkMode={darkMode} />
        ) : (
          <>
            {/* Summary Stats */}
            {data && <SummaryStats data={data} darkMode={darkMode} />}

            {/* Team Performance Section */}
            {data && <TeamPerformance data={data} darkMode={darkMode} />}
          </>
        )}

        {/* Last Updated Info */}
        <div className="text-center">
          <p
            className={`text-xs ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Last updated:{" "}
            {data?.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString()
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
