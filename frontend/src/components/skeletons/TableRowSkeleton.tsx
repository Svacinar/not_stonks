import { TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TableRowSkeletonProps {
  /** Number of columns to render */
  columnCount: number
  /** Optional array of widths for each column (e.g., ["w-24", "w-full", "w-16"]) */
  columnWidths?: string[]
  /** Additional class names for the row */
  className?: string
}

/**
 * A skeleton loading state for table rows.
 * Accepts a configurable column count for flexible use across different tables.
 */
export function TableRowSkeleton({
  columnCount,
  columnWidths,
  className,
}: TableRowSkeletonProps) {
  return (
    <TableRow className={cn(className)}>
      {Array.from({ length: columnCount }).map((_, index) => (
        <TableCell key={index}>
          <Skeleton
            className={cn("h-4", columnWidths?.[index] ?? "w-full")}
          />
        </TableCell>
      ))}
    </TableRow>
  )
}
