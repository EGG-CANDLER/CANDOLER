import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

import { Button } from './button'

export function ModeToggle({ className }) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title="Toggle light / dark mode"
    >
      <Sun className="size-4 scale-100 dark:scale-0" />
      <Moon className="absolute size-4 scale-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
