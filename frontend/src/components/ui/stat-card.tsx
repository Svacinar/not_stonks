import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

const statCardVariants = cva(
  "transition-colors duration-200",
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
  "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50",
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
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] font-light text-muted-foreground">
              {title}
            </p>
            <div className={cn(iconContainerVariants({ variant }), "w-9 h-9 rounded-md [&>svg]:w-4 [&>svg]:h-4")}>
              {icon}
            </div>
          </div>
          <p className="text-3xl font-black [font-variant-numeric:tabular-nums] text-foreground dark:text-gold mt-2">
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-2 gap-1">
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
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard, statCardVariants, iconContainerVariants }
