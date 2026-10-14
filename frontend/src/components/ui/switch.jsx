import * as React from 'react'
import { Switch as BaseSwitch } from '@base-ui/react'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const switchVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary bg-input',
  {
    variants: {
      size: {
        default: 'h-6 w-11',
        sm: 'h-4 w-7',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

const thumbVariants = cva(
  'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[unchecked]:translate-x-0',
  {
    variants: {
      size: {
        default: 'h-5 w-5 data-[checked]:translate-x-5',
        sm: 'h-3 w-3 data-[checked]:translate-x-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export const Switch = React.forwardRef(
  ({ className, size = 'default', ...props }, ref) => (
    <BaseSwitch.Root
      ref={ref}
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <BaseSwitch.Thumb className={cn(thumbVariants({ size }))} />
    </BaseSwitch.Root>
  ),
)
Switch.displayName = 'Switch'
