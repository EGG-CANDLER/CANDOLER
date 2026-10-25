import * as React from 'react'

import { cn } from '../../lib/utils'

export const Card = React.forwardRef(({ className, size = 'default', ...props }, ref) => (
  <div
    ref={ref}
    data-size={size}
    style={{
      '--card-spacing': size === 'sm' ? '1rem' : '1.5rem',
    }}
    className={cn(
      'rounded-xl border border-border bg-card text-card-foreground shadow-[0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      '@container/card-header flex flex-col space-y-1.5 p-[var(--card-spacing,1.5rem)]',
      className,
    )}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-[var(--card-spacing,1.5rem)] pt-0', className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-[var(--card-spacing,1.5rem)] pt-0',
      className,
    )}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export function CardHead({ title, caption, action }) {
  return (
    <div className="flex items-center justify-between pb-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function Stat({ value, caption, tone = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${tone}`}>
      <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
      {caption ? <div className="text-xs text-muted-foreground">{caption}</div> : null}
    </div>
  )
}
