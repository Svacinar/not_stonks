import * as React from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc" | null

export interface SortIconProps {
  direction: SortDirection
  className?: string
}

const SortIcon = React.forwardRef<HTMLSpanElement, SortIconProps>(
  ({ direction, className }, ref) => {
    const ariaLabel =
      direction === "asc"
        ? "Sorted ascending"
        : direction === "desc"
          ? "Sorted descending"
          : "Not sorted"

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center transition-all duration-200",
          className
        )}
        aria-label={ariaLabel}
        role="img"
      >
        {direction === null ? (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        ) : direction === "asc" ? (
          <ChevronUp className="h-4 w-4 text-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground" />
        )}
      </span>
    )
  }
)
SortIcon.displayName = "SortIcon"

export { SortIcon }
