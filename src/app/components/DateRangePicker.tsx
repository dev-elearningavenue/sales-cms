import { useState, useEffect, useRef } from "react";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  addMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DateRangePickerProps {
  darkMode: boolean;
  onApply: (startDate: Date, endDate: Date) => void;
  onClear: () => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

const DateRangePicker = ({
  darkMode,
  onApply,
  onClear,
  initialStartDate,
  initialEndDate,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>(
    initialStartDate || new Date()
  );
  const [endDate, setEndDate] = useState<Date>(initialEndDate || new Date());
  const [displayText, setDisplayText] = useState("Month to date");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [nextMonth, setNextMonth] = useState(
    new Date().getMonth() === 11 ? 0 : new Date().getMonth() + 1
  );
  const [nextYear, setNextYear] = useState(
    new Date().getMonth() === 11
      ? new Date().getFullYear() + 1
      : new Date().getFullYear()
  );
  const [selectingState, setSelectingState] = useState<"start" | "end" | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Preset options
  const dateRangeOptions = [
    { label: "Today", value: "today" },
    { label: "Last 7 days", value: "7days" },
    { label: "Last 4 weeks", value: "4weeks" },
    { label: "Last 3 months", value: "3months" },
    { label: "Last 12 months", value: "12months" },
    { label: "Month to date", value: "month-to-date" },
    { label: "Quarter to date", value: "quarter-to-date" },
    { label: "Year to date", value: "year-to-date" },
    { label: "All time", value: "all-time" },
  ];

  // Update display text based on dates
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setDisplayText(
        `${format(initialStartDate, "MMM dd, yyyy")} - ${format(
          initialEndDate,
          "MMM dd, yyyy"
        )}`
      );
    }
  }, [initialStartDate, initialEndDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle month navigation
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }

    if (nextMonth === 0) {
      setNextMonth(11);
      setNextYear(nextYear - 1);
    } else {
      setNextMonth(nextMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }

    if (nextMonth === 11) {
      setNextMonth(0);
      setNextYear(nextYear + 1);
    } else {
      setNextMonth(nextMonth + 1);
    }
  };

  // Apply preset date range
  const applyPresetRange = (rangeValue: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (rangeValue) {
      case "today":
        // Start and end are both today
        setDisplayText("Today");
        break;
      case "7days":
        start = subDays(today, 6);
        setDisplayText("Last 7 days");
        break;
      case "4weeks":
        start = subDays(today, 27);
        setDisplayText("Last 4 weeks");
        break;
      case "3months":
        start = subMonths(today, 3);
        setDisplayText("Last 3 months");
        break;
      case "12months":
        start = subMonths(today, 12);
        setDisplayText("Last 12 months");
        break;
      case "month-to-date":
        start = startOfMonth(today);
        setDisplayText("Month to date");
        break;
      case "quarter-to-date":
        // Find start of current quarter
        const currentMonth = today.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        start = startOfMonth(
          new Date(today.getFullYear(), quarterStartMonth, 1)
        );
        setDisplayText("Quarter to date");
        break;
      case "year-to-date":
        start = new Date(today.getFullYear(), 0, 1);
        setDisplayText("Year to date");
        break;
      case "all-time":
        start = new Date(2000, 0, 1); // Arbitrary old date as "all time"
        setDisplayText("All time");
        break;
      default:
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Handle day selection
  const handleDayClick = (day: Date) => {
    if (selectingState === "start" || !selectingState) {
      setStartDate(day);
      setSelectingState("end");
    } else if (selectingState === "end") {
      if (day < startDate) {
        // If selected end date is before start date, swap them
        setEndDate(startDate);
        setStartDate(day);
      } else {
        setEndDate(day);
      }
      setSelectingState(null);
      setDisplayText(
        `${format(startDate, "MMM dd, yyyy")} - ${format(day, "MMM dd, yyyy")}`
      );
    }
  };

  // Generate day cells for calendar
  const generateDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDay = new Date(year, month, i);
      const isSelected =
        (currentDay >= startDate && currentDay <= endDate) ||
        format(currentDay, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") ||
        format(currentDay, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");

      const isStart =
        format(currentDay, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd");
      const isEnd =
        format(currentDay, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");

      days.push(
        <button
          key={i}
          onClick={() => handleDayClick(currentDay)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors
            ${
              isSelected
                ? darkMode
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-600 text-white"
                : darkMode
                ? "hover:bg-gray-700 text-gray-300"
                : "hover:bg-gray-200 text-gray-800"
            }
            ${isStart ? "rounded-l-full" : ""}
            ${isEnd ? "rounded-r-full" : ""}
          `}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  // Handle apply button click
  const handleApply = () => {
    onApply(startDate, endDate);
    setIsOpen(false);
  };

  // Handle clear button click
  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  // Background and text colors based on dark mode
  const bgClass = darkMode
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-300";
  const textClass = darkMode ? "text-white" : "text-gray-800";
  const secondaryTextClass = darkMode ? "text-gray-400" : "text-gray-500";
  const buttonClass = darkMode
    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
    : "bg-indigo-600 hover:bg-indigo-700 text-white";
  const cancelButtonClass = darkMode
    ? "bg-gray-700 hover:bg-gray-600 text-white"
    : "bg-gray-200 hover:bg-gray-300 text-gray-800";

  return (
    <div className="relative" ref={containerRef}>
      {/* Date picker button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md border ${bgClass} ${textClass}`}
      >
        <Calendar className="h-4 w-4" />
        <span>{displayText}</span>
        <ChevronRight
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-[700px] rounded-lg shadow-lg ${bgClass} border p-4`}
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          <div className="flex flex-col">
            {/* Header with controls */}
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-medium ${textClass}`}>Your overview</h3>
              <div className="flex items-center space-x-2">
                <select
                  className={`px-3 py-2 rounded-md border ${bgClass} ${textClass}`}
                  value="month-to-date"
                  onChange={(e) => applyPresetRange(e.target.value)}
                >
                  <option value="compared-to">compared to</option>
                  <option value="previous-month">Previous month</option>
                  <option value="previous-period">Previous period</option>
                  <option value="previous-year">Previous year</option>
                </select>
                <select
                  className={`px-3 py-2 rounded-md border ${bgClass} ${textClass}`}
                  defaultValue="daily"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Date picker content */}
            <div className="flex">
              {/* Left sidebar - preset options */}
              <div className="w-48 border-r border-gray-200 dark:border-gray-700 pr-4">
                <div className="space-y-2">
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-3 py-2 rounded-md ${
                        displayText === option.label
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                          : darkMode
                          ? "hover:bg-gray-700 text-gray-300"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                      onClick={() => applyPresetRange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right side - calendar and date inputs */}
              <div className="flex-1 pl-4 relative">
                {/* Date inputs */}
                <div className="flex justify-between mb-4 space-x-4">
                  <div className="flex items-center">
                    <span className={`mr-2 ${textClass}`}>Start</span>
                    <input
                      type="text"
                      className={`px-3 py-2 rounded-md border ${bgClass} ${textClass}`}
                      value={format(startDate, "MM / dd / yyyy")}
                      readOnly
                      onClick={() => setSelectingState("start")}
                    />
                  </div>
                  <div className="flex items-center">
                    <span className={`mr-2 ${textClass}`}>End</span>
                    <input
                      type="text"
                      className={`px-3 py-2 rounded-md border ${bgClass} ${textClass}`}
                      value={format(endDate, "MM / dd / yyyy")}
                      readOnly
                      onClick={() => setSelectingState("end")}
                    />
                  </div>
                </div>

                {/* Preset quick options */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    className={`px-3 py-2 text-sm rounded-md ${
                      darkMode
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => applyPresetRange("today")}
                  >
                    Today
                  </button>
                  <button
                    className={`px-3 py-2 text-sm rounded-md ${
                      darkMode
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => applyPresetRange("7days")}
                  >
                    Last 7 days
                  </button>
                  <button
                    className={`px-3 py-2 text-sm rounded-md ${
                      darkMode
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => applyPresetRange("4weeks")}
                  >
                    Last 4 weeks
                  </button>
                </div>

                {/* Calendar */}
                <div className="flex">
                  {/* Current Month Calendar */}
                  <div className="w-1/2 pr-2">
                    <div className="flex justify-between items-center mb-2">
                      <button
                        onClick={goToPreviousMonth}
                        className={`p-1 rounded-full ${
                          darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
                        }`}
                      >
                        <ChevronLeft className={`h-4 w-4 ${textClass}`} />
                      </button>
                      <span className={`font-medium ${textClass}`}>
                        {format(
                          new Date(selectedYear, selectedMonth),
                          "MMMM yyyy"
                        )}
                      </span>
                      <div className="w-6"></div> {/* Spacer for alignment */}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div
                          key={day}
                          className={`h-8 flex items-center justify-center text-xs font-medium ${secondaryTextClass}`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {generateDays(selectedYear, selectedMonth)}
                    </div>
                  </div>

                  {/* Next Month Calendar */}
                  <div className="w-1/2 pl-2">
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-6"></div> {/* Spacer for alignment */}
                      <span className={`font-medium ${textClass}`}>
                        {format(new Date(nextYear, nextMonth), "MMMM yyyy")}
                      </span>
                      <button
                        onClick={goToNextMonth}
                        className={`p-1 rounded-full ${
                          darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
                        }`}
                      >
                        <ChevronRight className={`h-4 w-4 ${textClass}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div
                          key={day}
                          className={`h-8 flex items-center justify-center text-xs font-medium ${secondaryTextClass}`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {generateDays(nextYear, nextMonth)}
                    </div>
                  </div>
                </div>
                {/* Clear and Apply buttons */}
                <div className="absolute bottom-4 right-4 flex space-x-2">
                  <button
                    onClick={handleClear}
                    className={`px-4 py-2 rounded-md ${cancelButtonClass}`}
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleApply}
                    className={`px-4 py-2 rounded-md ${buttonClass}`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
