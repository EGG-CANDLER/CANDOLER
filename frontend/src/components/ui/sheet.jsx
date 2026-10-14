import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react'
import { cva } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '../../lib/utils'

export const Sheet = BaseDialog.Root
export const SheetTrigger = BaseDialog.Trigger
export const SheetClose = BaseDialog.Close
export const SheetPortal = BaseDialog.Portal

export const SheetBackdrop = React.forwardRef(({ className, ...props }, ref) => (
  <BaseDialog.Backdrop
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 data-open:fade-in-0 data-closed:fade-out-0',
      className,
    )}
    {...props}
  />
))
SheetBackdrop.displayName = 'SheetBackdrop'

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition duration-200 ease-in-out data-open:animate-in data-closed:animate-out',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b border-border data-closed:slide-out-to-top data-open:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t border-border data-closed:slide-out-to-bottom data-open:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r border-border sm:max-w-sm data-closed:slide-out-to-left data-open:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l border-border sm:max-w-sm data-closed:slide-out-to-right data-open:slide-in-from-right data-starting-style:opacity-0 data-ending-style:opacity-0 data-[side=right]:data-ending-style:translate-x-[2.5rem]',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

export const SheetContent = React.forwardRef(
  ({ side = 'right', className, children, ...props }, ref) => (
    <SheetPortal>
      <SheetBackdrop />
      <BaseDialog.Popup
        ref={ref}
        data-side={side}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <BaseDialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none cursor-pointer">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </SheetPortal>
  ),
)
SheetContent.displayName = 'SheetContent'

export function SheetHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

export function SheetFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

export const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <BaseDialog.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'
