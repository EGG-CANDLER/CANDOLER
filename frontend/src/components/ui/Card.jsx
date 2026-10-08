// Shared glass-card primitives. Visual only — no data logic.
export default function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`card${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHead({ title, caption, action }) {
  return (
    <div className="card-head">
      <div className="card-head-text">
        <h2>{title}</h2>
        {caption ? <p className="muted">{caption}</p> : null}
      </div>
      {action ? <div className="card-head-action">{action}</div> : null}
    </div>
  )
}

export function Stat({ value, caption, tone = '' }) {
  return (
    <div className={`stat${tone ? ` ${tone}` : ''}`}>
      <div className="stat-value">{value}</div>
      {caption ? <div className="stat-caption">{caption}</div> : null}
    </div>
  )
}
