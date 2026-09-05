import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  // Calculate visible page range (e.g. 1 2 3 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 mt-3 rounded-xl border ${className}`}
      style={{
        background: 'var(--bg-glass, rgba(255, 255, 255, 0.7))',
        borderColor: 'var(--border-glass, rgba(226, 232, 240, 0.8))',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Información de registros y selector de tamaño */}
      <div className="flex items-center gap-3 text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        <span>
          Mostrando <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> - <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong>
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l pl-3" style={{ borderColor: 'var(--border-color, #e2e8f0)' }}>
            <span className="text-xs">Por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="text-xs rounded-md border px-2 py-1 outline-none transition-all cursor-pointer font-medium"
              style={{
                background: 'var(--bg-surface, #ffffff)',
                borderColor: 'var(--border-color, #cbd5e1)',
                color: 'var(--text-primary)'
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Botones de navegación de página */}
      <div className="flex items-center gap-1">
        {/* Ir al inicio */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Primera página"
          className="p-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            borderColor: 'var(--border-color, #e2e8f0)',
            color: 'var(--text-primary)'
          }}
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Anterior */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Página anterior"
          className="p-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            borderColor: 'var(--border-color, #e2e8f0)',
            color: 'var(--text-primary)'
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ...
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 text-xs font-semibold rounded-lg border transition-all ${
                  isActive
                    ? 'shadow-sm font-bold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--brand-primary, #2563eb)',
                        borderColor: 'var(--brand-primary, #2563eb)',
                        color: '#ffffff'
                      }
                    : {
                        borderColor: 'var(--border-color, #e2e8f0)',
                        color: 'var(--text-primary)',
                        background: 'transparent'
                      }
                }
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Siguiente */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          title="Página siguiente"
          className="p-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            borderColor: 'var(--border-color, #e2e8f0)',
            color: 'var(--text-primary)'
          }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Ir al final */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Última página"
          className="p-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            borderColor: 'var(--border-color, #e2e8f0)',
            color: 'var(--text-primary)'
          }}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
