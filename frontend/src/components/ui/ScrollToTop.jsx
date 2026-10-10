import * as React from 'react'
import { ArrowUp } from 'lucide-react'

import { cn } from '../../lib/utils'
import { Button } from './button'

export function ScrollToTop({ className }) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 240)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-6 right-6 z-40 rounded-full shadow-md transition-all duration-200 ease-linear cursor-pointer',
        visible ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none',
        className,
      )}
      title="Scroll to top"
    >
      <ArrowUp className="size-4" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  )
}
