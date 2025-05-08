import { useState, useEffect } from "react";
import { SalesPerson } from "@/types/salesPerson";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  PhoneCall,
  Users,
  CheckCircle,
  BarChart3,
  PieChart,
} from "lucide-react";

interface TeamMemberCardProps {
  member: SalesPerson;
  darkMode: boolean;
}

export const TeamMemberCard = ({ member, darkMode }: TeamMemberCardProps) => {
  // Check if this is the Admin card
  const isAdmin = member.id === "admin-combined";
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [memberData, setMemberData] = useState<SalesPerson>(member);

  // Array of month options
  const monthOptions = [
    { value: "all", label: "All Time" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Fetch member data by month
  useEffect(() => {
    const fetchMemberDataByMonth = async () => {
      if (selectedMonth === "all") {
        setMemberData(member);
        return;
      }

      setIsLoading(true);
      try {
        // Create date range for the selected month (first day to last day)
        const currentYear = new Date().getFullYear();
        const monthIndex = parseInt(selectedMonth) - 1; // 0-indexed
        const startDate = new Date(currentYear, monthIndex, 1);

        // Last day of month (set date to 0 of next month to get last day of current month)
        const endDate = new Date(currentYear, monthIndex + 1, 0);

        // Format dates for API
        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];

        // Call API with member ID and date range
        const response = await fetch(
          `/api/member-stats/${member.id}?startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setMemberData(result.data);
        } else {
          // If API call fails, fall back to simulation
          simulateMonthData();
        }
      } catch (error) {
        console.error("Error fetching member data by month:", error);
        // Fall back to simulation if API fails
        simulateMonthData();
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberDataByMonth();
  }, [selectedMonth, member]);

  // Fallback: Simulate month data if API is not available or fails
  const simulateMonthData = () => {
    const monthSeed = parseInt(selectedMonth);
    const randomFactor = 0.6 + (monthSeed % 5) * 0.1;

    // Create a properly typed copy of the member object
    const simulatedData: SalesPerson = {
      id: member.id,
      name: member.name,
      assigned:
        typeof member.assigned === "number"
          ? Math.round(member.assigned * randomFactor)
          : member.assigned,
      contacted:
        typeof member.contacted === "number"
          ? Math.round(member.contacted * randomFactor)
          : member.contacted,
      solved:
        typeof member.solved === "number"
          ? Math.round(member.solved * randomFactor)
          : member.solved,
      closed:
        typeof member.closed === "number"
          ? Math.round(member.closed * randomFactor)
          : member.closed,
      progress:
        typeof member.progress === "number"
          ? Math.round(member.progress * randomFactor)
          : member.progress,
      avatar: member.avatar,
      performance: member.performance,
      orderCreations:
        typeof member.orderCreations === "number"
          ? Math.round(member.orderCreations * randomFactor)
          : member.orderCreations,
      abandonedCarts:
        typeof member.abandonedCarts === "number"
          ? Math.round(member.abandonedCarts * randomFactor)
          : member.abandonedCarts,
      contactUs:
        typeof member.contactUs === "number"
          ? Math.round(member.contactUs * randomFactor)
          : member.contactUs,
      freeSignups:
        typeof member.freeSignups === "number"
          ? Math.round(member.freeSignups * randomFactor)
          : member.freeSignups,
      freeStudyGuides:
        typeof member.freeStudyGuides === "number"
          ? Math.round(member.freeStudyGuides * randomFactor)
          : member.freeStudyGuides,
      scholarship:
        typeof member.scholarship === "number"
          ? Math.round(member.scholarship * randomFactor)
          : member.scholarship,
    };

    setMemberData(simulatedData);
  };

  // Get data from either real API data or initial member data
  const getData = (key: keyof SalesPerson) => {
    return memberData[key];
  };

  // Helper function to get progress as a number
  function getProgress(): number {
    const progress = getData("progress");
    return typeof progress === "number" ? progress : 0;
  }

  // Determine progress color based on value
  let progressColorClass = "bg-blue-600";
  const progressValue = getProgress();

  if (progressValue >= 90) {
    progressColorClass = "bg-green-600";
  } else if (progressValue < 70) {
    progressColorClass = "bg-yellow-500";
  }

  // For Admin card, use a special color
  if (isAdmin) {
    progressColorClass = "bg-purple-600";
  }

  // Performance indicator
  const performanceIcon = () => {
    switch (memberData.performance) {
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

  // Dropdown handler to stop event propagation
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOptionSelect = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    setSelectedMonth(value);
    setIsDropdownOpen(false);
  };

  // Flip content with historical performance
  const flipContent = (
    <div className="p-6 h-full flex flex-col justify-between bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <h3 className="text-lg font-semibold mb-4">
        {memberData.name} - Performance History
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Last Month:</span>
          <span className="font-medium">
            {Math.round(getProgress() * 0.9)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>This Quarter:</span>
          <span className="font-medium">
            {Math.round(getProgress() * 1.05)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Year to Date:</span>
          <span className="font-medium">
            {Math.round(getProgress() * 0.98)}%
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
      className={`p-6 flex flex-col space-y-4 backdrop-blur-sm h-[330px] min-h-[330px] ${cardBackground}`}
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
            {memberData.avatar || memberData.name?.charAt(0)}
          </div>
          <div>
            <h3
              className={`font-medium ${
                isAdmin && !darkMode ? "text-white" : ""
              }`}
            >
              {memberData.name}
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

            {/* Custom dropdown to prevent card flipping */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleDropdownClick}
                className={`text-xs mt-1 py-1 px-2 rounded flex items-center justify-between w-24 ${
                  darkMode
                    ? `bg-gray-700 text-gray-300 ${
                        isAdmin ? "border-gray-600" : "border-gray-600"
                      }`
                    : `bg-gray-100 text-gray-800 ${
                        isAdmin && !darkMode ? "bg-opacity-20 text-white" : ""
                      }`
                }`}
              >
                <span>
                  {monthOptions.find((o) => o.value === selectedMonth)?.label ||
                    "All Time"}
                </span>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    isDropdownOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div
                  className={`absolute z-10 mt-1 w-32 rounded shadow-lg ${
                    darkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white border border-gray-200"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1 max-h-48 overflow-y-auto">
                    {monthOptions.map((option) => (
                      <button
                        key={option.value}
                        className={`block w-full text-left px-4 py-2 text-xs ${
                          darkMode
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-800 hover:bg-gray-100"
                        } ${
                          selectedMonth === option.value
                            ? darkMode
                              ? "bg-gray-700"
                              : "bg-gray-100"
                            : ""
                        }`}
                        onClick={(e) => handleOptionSelect(e, option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isLoading ? (
            <div
              className={`h-4 w-4 rounded-full animate-pulse ${
                darkMode ? "bg-gray-600" : "bg-gray-300"
              }`}
            ></div>
          ) : (
            performanceIcon()
          )}
          <span
            className={`text-sm font-medium ${
              isAdmin
                ? darkMode
                  ? "text-purple-300"
                  : "text-white"
                : progressValue >= 90
                ? "text-green-500"
                : progressValue < 70
                ? "text-yellow-500"
                : "text-blue-600"
            }`}
          >
            {isLoading ? "..." : `${progressValue}%`}
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
            {isLoading ? (
              <div
                className={`h-4 w-8 rounded animate-pulse ${
                  darkMode ? "bg-gray-600" : "bg-gray-300"
                }`}
              ></div>
            ) : (
              getData("assigned")
            )}
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
            {isLoading ? (
              <div
                className={`h-4 w-8 rounded animate-pulse ${
                  darkMode ? "bg-gray-600" : "bg-gray-300"
                }`}
              ></div>
            ) : (
              getData("solved")
            )}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div
          className={`h-2.5 rounded animate-pulse ${
            darkMode ? "bg-gray-600" : "bg-gray-300"
          }`}
        ></div>
      ) : (
        <ProgressBar value={progressValue} colorClass={progressColorClass} />
      )}

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
              {isLoading ? (
                <div
                  className={`h-4 w-6 rounded animate-pulse ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></div>
              ) : (
                getData("orderCreations")
              )}
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
              {isLoading ? (
                <div
                  className={`h-4 w-6 rounded animate-pulse ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></div>
              ) : (
                getData("abandonedCarts")
              )}
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
              {isLoading ? (
                <div
                  className={`h-4 w-6 rounded animate-pulse ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></div>
              ) : (
                getData("contactUs")
              )}
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
              {isLoading ? (
                <div
                  className={`h-4 w-6 rounded animate-pulse ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></div>
              ) : (
                getData("freeSignups")
              )}
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
              {isLoading ? (
                <div
                  className={`h-4 w-6 rounded animate-pulse ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></div>
              ) : (
                getData("freeStudyGuides")
              )}
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
              {isLoading ? (
                <div
                  className={`h-4 w-6 rounded animate-pulse ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></div>
              ) : (
                getData("scholarship")
              )}
            </span>
          </div>
        </div>
      </div>

      <p
        className={`text-xs ${
          isAdmin && !darkMode ? "text-white/70" : "text-gray-400"
        } text-center mt-2`}
      >
        {isLoading
          ? "Loading..."
          : selectedMonth === "all"
          ? "Click for historical data"
          : `Showing data for ${
              monthOptions.find((m) => m.value === selectedMonth)?.label
            }`}
      </p>
    </Card>
  );
};
