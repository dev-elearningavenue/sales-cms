import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/Card";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  percentChange?: number;
  darkMode: boolean;
}

export const StatCard = ({
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
      className={`p-6 flex flex-col overflow-hidden relative group h-60 min-h-60 ${colors.background}`} // Increased height for stat cards
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
            <ArrowUpRight className="h-4 w-4 mr-1 transform rotate-180" />
          )}
          <span className="text-sm font-medium">
            {Math.abs(percentChange)}%{" "}
            {percentChange > 0 ? "increase" : "decrease"}
          </span>
        </div>
      )}

      <p className="text-xs text-white/70 mt-auto pt-2">Click to see more</p>
    </Card>
  );
};
