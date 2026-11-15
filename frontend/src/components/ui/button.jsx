import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-[#2D6A4F] active:scale-[0.99]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 active:scale-[0.99]',
        outline:
          'border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:scale-[0.99]',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:scale-[0.99]',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.99]',
        link: 'text-primary underline-offset-4 hover:underline hover:text-[#2D6A4F]',
      },
      size: {
        default: 'h-10 sm:h-9 min-h-[44px] sm:min-h-0 px-4 py-2',
        xs: 'h-8 sm:h-7 min-h-[36px] sm:min-h-0 rounded-md px-2 text-xs',
        sm: 'h-9 sm:h-8 min-h-[40px] sm:min-h-0 rounded-md px-3 text-xs',
        lg: 'h-11 sm:h-10 min-h-[44px] rounded-lg px-6',
        icon: 'size-11 sm:size-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0',
        'icon-xs': 'size-9 sm:size-7 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 rounded-md',
        'icon-sm': 'size-10 sm:size-8 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 rounded-md',
        'icon-lg': 'size-11 sm:size-10 min-h-[44px] min-w-[44px] rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export const Button = React.forwardRef(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
