import * as React from 'react'
import { Tabs as BaseTabs } from '@base-ui/react'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

export const Tabs = BaseTabs.Root

const tabsListVariants = cva(
  'inline-flex items-center text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'h-9 rounded-lg bg-muted p-1 justify-center',
        line: 'h-10 border-b border-border gap-4 bg-transparent justify-start',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export const TabsList = React.forwardRef(
  ({ className, variant = 'default', ...props }, ref) => (
    <BaseTabs.List
      ref={ref}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  ),
)
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <BaseTabs.Tab
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all cursor-pointer focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
          variant === 'default'
            ? 'rounded-md px-3 py-1 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-xs hover:text-foreground'
            : 'px-3 py-2 data-[selected]:text-foreground hover:text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity data-[selected]:after:opacity-100 data-active:after:opacity-100',
          className,
        )}
        {...props}
      />
    )
  },
)
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <BaseTabs.Panel
    ref={ref}
    className={cn(
      'mt-2 focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none',
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'
