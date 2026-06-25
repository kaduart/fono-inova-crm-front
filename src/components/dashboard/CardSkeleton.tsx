import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
