'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemName = 'items',
  isLoading = false,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const validCurrentPage = Math.max(1, Math.min(currentPage || 1, Math.max(1, totalPages || 1)));
  const startItem = Math.min((validCurrentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate smart pagination range with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 1) return [1];

    const delta = 1; // pages before/after current
    const range: (number | string)[] = [];

    for (
      let i = Math.max(2, validCurrentPage - delta);
      i <= Math.min(totalPages - 1, validCurrentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (validCurrentPage - delta > 2) {
      range.unshift('...');
    }
    if (validCurrentPage + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-white/95 rounded-b-xl backdrop-blur-xs">
      {/* Range text */}
      <div className="text-xs text-slate-500 font-medium text-center sm:text-left flex items-center gap-2">
        <span>
          Showing <strong className="text-slate-900 font-semibold">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-slate-900 font-semibold">{totalItems.toLocaleString()}</strong> {itemName}
        </span>
        {isLoading && (
          <span className="inline-block w-3 h-3 rounded-full border-2 border-slate-300 border-t-[#e60012] animate-spin" />
        )}
      </div>

      {/* Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {/* Jump to first page */}
          {totalPages > 4 && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={validCurrentPage === 1 || isLoading}
              className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="First page"
              aria-label="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Previous page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, validCurrentPage - 1))}
            disabled={validCurrentPage === 1 || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 text-xs text-slate-400 font-bold select-none"
                  >
                    …
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === validCurrentPage;
              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  disabled={isLoading}
                  className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#e60012] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, validCurrentPage + 1))}
            disabled={validCurrentPage >= totalPages || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to last page */}
          {totalPages > 4 && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={validCurrentPage >= totalPages || isLoading}
              className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Last page"
              aria-label="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

