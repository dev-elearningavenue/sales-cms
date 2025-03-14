// src/components/LoadingSkeleton.tsx
export function LoadingSkeleton({ component = "profile" }) {
  return component === "profile" ? (
    <div className="animate-pulse">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  ) : component === "All Leads" ? (
    <div className="flex flex-col justify-center items-center h-64 space-y-4">
      <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
      <span className="text-lg font-medium text-gray-700">
        Fetching the Results...
      </span>
    </div>
  ) : (
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
}
