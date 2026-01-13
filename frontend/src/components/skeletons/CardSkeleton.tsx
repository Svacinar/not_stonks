import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface CardSkeletonProps {
  /** Whether to show a title skeleton in the header */
  showHeader?: boolean
  /** Whether to show a description skeleton below the title */
  showDescription?: boolean
  /** Additional class names */
  className?: string
}

/**
 * A skeleton loading state for Card components.
 * Matches the general dimensions and layout of a typical Card.
 */
export function CardSkeleton({
  showHeader = true,
  showDescription = false,
  className,
}: CardSkeletonProps) {
  return (
    <Card className={cn(className)}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          {showDescription && <Skeleton className="h-4 w-1/2" />}
        </CardHeader>
      )}
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}
