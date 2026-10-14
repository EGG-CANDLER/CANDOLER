import * as React from 'react'
import { Avatar as BaseAvatar } from '@base-ui/react'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full ring-background',
  {
    variants: {
      size: {
        default: 'h-10 w-10',
        sm: 'h-8 w-8',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export const Avatar = React.forwardRef(
  ({ className, size = 'default', ...props }, ref) => (
    <BaseAvatar.Root
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  ),
)
Avatar.displayName = 'Avatar'

export const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <BaseAvatar.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = 'AvatarImage'

export const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <BaseAvatar.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
      className,
    )}
    {...props}
  />
))
AvatarFallback.displayName = 'AvatarFallback'

export function AvatarBadge({ className, ...props }) {
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 block size-2.5 rounded-full bg-emerald-500 ring-2 ring-background',
        className,
      )}
      {...props}
    />
  )
}

export function AvatarGroup({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center -space-x-2 [&>*]:ring-2 [&>*]:ring-background', className)}
      {...props}
    >
      {children}
    </div>
  )
}
