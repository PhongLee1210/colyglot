import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-surface-2", className)}
    />
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-10 rounded-full" />
        </div>
      ))}
    </div>
  );
}
