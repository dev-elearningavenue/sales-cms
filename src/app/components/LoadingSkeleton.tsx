// src/components/LoadingSkeleton.tsx
import React from "react";

interface LoadingSkeletonProps {
  component?: "profile" | "page" | "All Leads" | "default" | "my leads";
  height?: string;
  width?: string;
}

export function LoadingSkeleton({
  component = "default",
  height = "h-8",
  width = "w-32",
}: LoadingSkeletonProps) {
  switch (component) {
    case "profile":
      return (
        <div className="animate-pulse flex items-center">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mr-2"></div>
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      );

    case "page":
      return (
        <div className="w-full h-screen flex flex-col items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            Loading...
          </p>
        </div>
      );

    case "All Leads":
      return (
        <div className="w-full space-y-4 p-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse"></div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );

    case "my leads":
      return (
        <div className="mx-auto max-w-2xl rounded-md border border-blue-300 p-4">
          <div className="flex animate-pulse space-x-4">
            <div className="size-8 rounded-full bg-indigo-300"></div>
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 rounded bg-indigo-400"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 h-2 rounded bg-indigo-300"></div>
                  <div className="col-span-1 h-2 rounded bg-indigo-300"></div>
                </div>
                <div className="h-2 rounded bg-indigo-200"></div>
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="animate-pulse">
          <div
            className={`${height} ${width} bg-gray-200 dark:bg-gray-700 rounded`}
          ></div>
        </div>
      );
  }
}
