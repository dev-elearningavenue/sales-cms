// src/app/dashboard/page.tsx
"use client";
import { useApp } from "@/contexts/AppContext";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import DateRangePicker from "@/components/DateRangePicker";

import { ApiResponse } from "@/types/apiResponse";

import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { CategoryCard } from "@/components/CategoryCard";

import { useToast } from "@/components/ui/use-toast";

import { SummaryStats } from "@/components/SummaryStats";
import { TeamPerformance } from "@/components/TeamPerformance";

import {
  Users,
  CheckCircle,
  Clock,
  PhoneCall,
  XCircle,
  BarChart3,
  ChevronUp,
  PieChart,
  RefreshCcw,
  ArrowUpRight,
  Calendar,
  ChevronRight,
} from "lucide-react";

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

// Custom hook for API data fetching with date filtering
const useLeadsData = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const fetchData = async (startDate?: Date, endDate?: Date) => {
    setLoading(true);
    try {
      let url = "/api/dashboard";
      const params = new URLSearchParams();

      if (startDate) {
        params.append("startDate", startDate.toISOString().split("T")[0]);
      }

      if (endDate) {
        params.append("endDate", endDate.toISOString().split("T")[0]);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Actual API call to get dashboard metrics
      const response = await fetch(url);
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

  useEffect(() => {
    fetchData(dateRange.startDate || undefined, dateRange.endDate || undefined);
  }, [dateRange]);

  const refreshData = async () => {
    fetchData(dateRange.startDate || undefined, dateRange.endDate || undefined);
  };

  const updateDateRange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
  };

  const clearDateRange = () => {
    setDateRange({ startDate: null, endDate: null });
  };

  return {
    data,
    loading,
    error,
    refreshData,
    updateDateRange,
    clearDateRange,
    dateRange,
  };
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
  const { darkMode } = useThemeFromContext();
  const {
    data,
    loading: dataLoading,
    error: dataError,
    refreshData,
    updateDateRange,
    clearDateRange,
    dateRange,
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
              <DateRangePicker
                darkMode={darkMode}
                onApply={updateDateRange}
                onClear={clearDateRange}
                initialStartDate={dateRange.startDate || undefined}
                initialEndDate={dateRange.endDate || undefined}
              />

              <button
                onClick={refreshData}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <RefreshCcw className="h-4 w-4" />
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
              {data?.dateRange?.startDate && (
                <span className="ml-2">
                  Filtering:{" "}
                  {new Date(data.dateRange.startDate).toLocaleDateString()}
                  {data.dateRange.endDate &&
                    ` to ${new Date(
                      data.dateRange.endDate
                    ).toLocaleDateString()}`}
                </span>
              )}
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
            <DateRangePicker
              darkMode={darkMode}
              onApply={updateDateRange}
              onClear={clearDateRange}
              initialStartDate={dateRange.startDate || undefined}
              initialEndDate={dateRange.endDate || undefined}
            />

            <button
              onClick={refreshData}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <RefreshCcw className="h-4 w-4" />
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
            {/* {data?.dateRange?.startDate && (
              <span className="ml-2">
                Filtering:{" "}
                {new Date(data.dateRange.startDate).toLocaleDateString()}
                {data.dateRange.endDate &&
                  ` to ${new Date(
                    data.dateRange.endDate
                  ).toLocaleDateString()}`}
              </span>
            )} */}
          </p>
        </div>
      </div>
    </div>
  );
}
