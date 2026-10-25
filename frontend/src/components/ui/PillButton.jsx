import * as React from 'react'
import { Link } from 'react-router-dom'

import { cn } from '../../lib/utils'
import { buttonVariants } from './button'

// PillButton — gently rounded button (rounded-xl) adhering to design system tokens
export default function PillButton({
  as,
  to,
  href,
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...rest
}) {
  let mappedVariant = variant
  if (variant === 'primary') mappedVariant = 'default'
  else if (variant === 'dark') mappedVariant = 'secondary'
  else if (variant === 'danger') mappedVariant = 'destructive'

  const cls = cn(
    buttonVariants({ variant: mappedVariant, size }),
    'rounded-lg font-medium cursor-pointer',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    )
  }
  const Tag = as || 'button'
  if (Tag === 'button' && rest.type === undefined) rest.type = 'button'
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  )
}
