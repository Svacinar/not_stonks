import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

const statCardVariants = cva(
  "transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
  {
    variants: {
      variant: {
        default: "",
        success: "",
        warning: "",
        danger: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const iconContainerVariants = cva(
  "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary/20 to-primary/5",
        success: "bg-gradient-to-br from-success/20 to-success/5",
        warning: "bg-gradient-to-br from-amber-500/20 to-amber-500/5",
        danger: "bg-gradient-to-br from-destructive/20 to-destructive/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; label?: string }
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, variant, title, value, icon, trend, ...props }, ref) => {
    const trendIsPositive = trend ? trend.value >= 0 : null

    return (
      <Card
        ref={ref}
        className={cn(statCardVariants({ variant, className }))}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className={cn(iconContainerVariants({ variant }))}>
              {icon}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              <p className="text-2xl font-semibold text-foreground truncate">
                {value}
              </p>
              {trend && (
                <div className="flex items-center mt-1 gap-1">
                  {trendIsPositive ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      trendIsPositive ? "text-success" : "text-destructive"
                    )}
                  >
                    {trendIsPositive && "+"}
                    {trend.value}%
                  </span>
                  {trend.label && (
                    <span className="text-xs text-muted-foreground">
                      {trend.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard, statCardVariants, iconContainerVariants }
