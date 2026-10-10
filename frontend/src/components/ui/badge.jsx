import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        ghost: 'border-transparent text-foreground hover:bg-accent',
        link: 'border-transparent text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
