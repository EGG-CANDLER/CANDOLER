import * as React from 'react'

export function BackgroundRipple({ rows = 6, cols = 8 }) {
  const total = rows * cols
  const [activeCells, setActiveCells] = React.useState({})

  React.useEffect(() => {
    const interval = setInterval(() => {
      // Pick 3 to 5 random cells
      const count = 3 + Math.floor(Math.random() * 3)
      const nextActive = {}
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * total)
        nextActive[idx] = {
          opacity: 0.35 + Math.random() * 0.45,
          filter: `brightness(${1.15 + Math.random() * 0.35})`,
          transform: `scale(${1.02 + Math.random() * 0.06})`,
        }
      }
      setActiveCells(nextActive)
    }, 2500)

    return () => clearInterval(interval)
  }, [total])

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="w-full h-full grid p-4 gap-3 opacity-40 dark:opacity-60"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const style = activeCells[i] || {
            opacity: 0.08,
            filter: 'brightness(1)',
            transform: 'scale(1)',
          }
          return (
            <div
              key={i}
              style={style}
              className="rounded-xl border border-border/25 bg-muted/20 shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset] transition-[transform,opacity,filter] duration-2500 ease-in-out will-change-transform"
            />
          )
        })}
      </div>
    </div>
  )
}
