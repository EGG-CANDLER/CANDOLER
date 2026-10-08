import { Link } from 'react-router-dom'

// PillButton — rounded pill CTA used across the dashboard.
// variant: primary (mint) | dark | ghost | danger · size: '' | 'sm'
export default function PillButton({
  as,
  to,
  href,
  variant = 'dark',
  size = '',
  className = '',
  children,
  ...rest
}) {
  const cls =
    `pill-btn pill-${variant}` +
    (size ? ` pill-${size}` : '') +
    (className ? ` ${className}` : '')

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
