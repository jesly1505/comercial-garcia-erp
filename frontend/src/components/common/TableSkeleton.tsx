import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="flex items-center gap-4 py-4 px-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50"
          >
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                style={{
                  width: cIdx === 0 ? '15%' : cIdx === 1 ? '30%' : '15%',
                  opacity: 1 - rIdx * 0.12,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
