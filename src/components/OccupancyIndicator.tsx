import { cn } from "@/lib/utils";

type OccupancyStatus = 'empty' | 'occupied' | 'reserved';

interface OccupancyIndicatorProps {
  status: OccupancyStatus;
  className?: string;
}

export function OccupancyIndicator({ status, className }: OccupancyIndicatorProps) {
  const statusStyles = {
    empty: 'bg-green-500 shadow-green-500/50',
    occupied: 'bg-orange-500 shadow-orange-500/50',
    reserved: 'bg-red-500 shadow-red-500/50',
  };

  return (
    <div className={cn('relative flex h-16 w-16 items-center justify-center rounded-full', className)}>
      <div className={cn('absolute h-full w-full rounded-full animate-pulse', statusStyles[status], 'opacity-75')} />
      <div className={cn('h-12 w-12 rounded-full border-2 border-white/50', statusStyles[status])} />
    </div>
  );
}
