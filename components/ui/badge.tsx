import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Ensure badge variants have explicit styles that won't be purged in production
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Add explicit color variants that will be preserved in production
        // HTTP methods
        get: "border-green-500 bg-green-500/20 text-green-500 hover:bg-green-500/30",
        post: "border-blue-500 bg-blue-500/20 text-blue-500 hover:bg-blue-500/30",
        put: "border-yellow-500 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
        delete: "border-red-500 bg-red-500/20 text-red-500 hover:bg-red-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  style?: React.CSSProperties
}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  // Define default styles based on variant
  let defaultStyle: React.CSSProperties = {}

  // HTTP methods
  if (variant === "get") {
    defaultStyle = {
      borderColor: "rgba(34, 197, 94, 0.3)",
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      color: "rgb(34, 197, 94)",
    }
  } else if (variant === "post") {
    defaultStyle = {
      borderColor: "rgba(59, 130, 246, 0.3)",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      color: "rgb(59, 130, 246)",
    }
  } else if (variant === "put") {
    defaultStyle = {
      borderColor: "rgba(234, 179, 8, 0.3)",
      backgroundColor: "rgba(234, 179, 8, 0.1)",
      color: "rgb(234, 179, 8)",
    }
  } else if (variant === "delete") {
    defaultStyle = {
      borderColor: "rgba(239, 68, 68, 0.3)",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      color: "rgb(239, 68, 68)",
    }
  }

  return <div className={cn(badgeVariants({ variant }), className)} style={{ ...defaultStyle, ...style }} {...props} />
}

export { Badge, badgeVariants }

