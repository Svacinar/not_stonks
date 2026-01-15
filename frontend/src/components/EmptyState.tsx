import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  illustration: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, illustration, title, description, action, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "text-center py-16 animate-fade-in-up opacity-0",
          className
        )}
        style={{ animationFillMode: 'forwards' }}
        {...props}
      >
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="text-muted-foreground">
            {illustration}
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            {description}
          </p>
          {action && (
            <div className="mt-4">
              {action}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
