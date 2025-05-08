import { Card } from "@/components/Card";

interface CategoryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  darkMode: boolean;
}

export const CategoryCard = ({
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
      className={`p-3 flex flex-col flex-1 overflow-hidden h-24 min-h-24 ${colors.background}`}
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
