import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

export interface GradientTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean
}

const GradientText = React.forwardRef<HTMLSpanElement, GradientTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span"
    return (
      <Comp
        className={cn(
          "bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
GradientText.displayName = "GradientText"

export { GradientText }
