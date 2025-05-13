import { XCircle } from "lucide-react";

// app/components/ErrorDisplay.tsx
export const ErrorDisplay = ({
  message,
  type = "data",
}: {
  message: string;
  type?: "data" | "session";
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <div className="flex items-center">
        <XCircle className="h-5 w-5 text-red-500 mr-2" />
        <h3 className="text-red-800 font-medium">
          {type === "data" ? "Data Error" : "Session Error"}
        </h3>
      </div>
      <p className="text-red-700 mt-1">{message}</p>
      <button className="mt-2 px-4 py-1 bg-red-100 hover:bg-red-200 rounded text-red-800 text-sm">
        Try Again
      </button>
    </div>
  );
};
