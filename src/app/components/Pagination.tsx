import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (perPage: number) => void;
  getPaginationButtons: () => number[];
  showItemsPerPage?: boolean;
  compact?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  getPaginationButtons,
  showItemsPerPage = true,
  compact = false,
}) => {
  return (
    <div
      className={`${
        compact ? "mt-0" : "mt-4"
      } flex flex-col sm:flex-row items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-2">
        <button
          className={`${
            compact ? "p-1" : "p-2"
          } border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          aria-label="First page"
        >
          <ChevronsLeft className={`${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>
        <button
          className={`${
            compact ? "p-1" : "p-2"
          } border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className={`${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>

        {/* Page number buttons - hidden on small screens when compact */}
        <div className={`flex gap-1 ${compact ? "hidden md:flex" : ""}`}>
          {getPaginationButtons().map((pageNum) => (
            <button
              key={pageNum}
              className={`${compact ? "w-8 h-8 text-sm" : "w-10 h-10"} ${
                currentPage === pageNum
                  ? "bg-blue-100 text-blue-700 font-medium border-blue-300"
                  : "hover:bg-gray-100 text-gray-700"
              } border border-gray-300 rounded-md transition-colors`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}
        </div>

        {/* Simple page indicator for compact mode */}
        {compact && (
          <span className="mx-1 text-sm md:hidden">
            {currentPage} / {totalPages}
          </span>
        )}

        <button
          className={`${
            compact ? "p-1" : "p-2"
          } border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          aria-label="Next page"
        >
          <ChevronRight className={`${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>
        <button
          className={`${
            compact ? "p-1" : "p-2"
          } border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight className={`${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>
      </div>

      {showItemsPerPage && (
        <div className="relative group">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <select
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[50, 100, 200, 500].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagination;
