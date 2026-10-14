import * as React from 'react'
import { PanelLeft } from 'lucide-react'

import { cn } from '../../lib/utils'
import { Button } from './button'
import { Sheet, SheetContent } from './sheet'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

const SidebarContext = React.createContext(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }
  return context
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const [openMobile, setOpenMobile] = React.useState(false)
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open

  const setOpen = React.useCallback(
    (value) => {
      const openState = typeof value === 'function' ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  const toggleSidebar = React.useCallback(() => {
    return window.innerWidth < 768
      ? setOpenMobile((prev) => !prev)
      : setOpen((prev) => !prev)
  }, [setOpen])

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'

  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        style={{
          '--sidebar-width': SIDEBAR_WIDTH,
          '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
          ...style,
        }}
        className={cn(
          'group/sidebar-wrapper flex min-h-screen w-full has-[[data-variant=inset]]:bg-background',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export const Sidebar = React.forwardRef(
  (
    {
      side = 'left',
      variant = 'sidebar',
      collapsible = 'icon',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { state, openMobile, setOpenMobile } = useSidebar()

    if (collapsible === 'none') {
      return (
        <div
          ref={ref}
          className={cn(
            'flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      )
    }

    return (
      <>
        {/* Mobile drawer */}
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side={side}
            className="w-[var(--sidebar-width-mobile,18rem)] bg-sidebar p-0 text-sidebar-foreground border-sidebar-border sm:hidden"
          >
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <div
          ref={ref}
          className="group peer hidden md:block text-sidebar-foreground"
          data-state={state}
          data-collapsible={state === 'collapsed' ? collapsible : ''}
          data-variant={variant}
          data-side={side}
        >
          {/* Sidebar gap placeholder for layout */}
          <div
            className={cn(
              'relative h-svh bg-transparent transition-[width] duration-200 ease-linear',
              state === 'collapsed'
                ? collapsible === 'icon'
                  ? 'w-[var(--sidebar-width-icon)]'
                  : 'w-0'
                : 'w-[var(--sidebar-width)]',
            )}
          />
          <div
            className={cn(
              'fixed inset-y-0 z-10 hidden h-svh flex-col border-sidebar-border transition-[left,right,width] duration-200 ease-linear md:flex bg-sidebar',
              side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
              state === 'collapsed'
                ? collapsible === 'icon'
                  ? 'w-[var(--sidebar-width-icon)]'
                  : 'w-0 -left-[var(--sidebar-width)]'
                : 'w-[var(--sidebar-width)]',
              variant === 'floating' &&
                'm-2 rounded-xl border shadow-sm ring-1 ring-border',
              variant === 'inset' && 'border-none bg-sidebar',
              className,
            )}
            {...props}
          >
            <div className="flex h-full w-full flex-col">{children}</div>
          </div>
        </div>
      </>
    )
  },
)
Sidebar.displayName = 'Sidebar'

export const SidebarTrigger = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={(e) => {
        onClick?.(e)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = 'SidebarTrigger'

export function SidebarHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2 p-3', className)} {...props} />
}

export function SidebarContent({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-1 flex-col gap-2 overflow-auto p-3', className)}
      {...props}
    />
  )
}

export function SidebarFooter({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2 p-3 mt-auto', className)} {...props} />
}

export function SidebarGroup({ className, ...props }) {
  return <div className={cn('relative flex w-full min-w-0 flex-col p-1', className)} {...props} />
}

export function SidebarGroupLabel({ className, ...props }) {
  return (
    <div
      className={cn(
        'duration-200 flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none transition-[margin,opacity] ease-linear group-data-[collapsible=icon]:-mt-7 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({ className, ...props }) {
  return <div className={cn('w-full text-sm', className)} {...props} />
}

export function SidebarMenu({ className, ...props }) {
  return <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }) {
  return <li className={cn('group/menu-item relative', className)} {...props} />
}

export const SidebarMenuButton = React.forwardRef(
  (
    {
      as: Tag = 'button',
      isActive = false,
      variant = 'default',
      size = 'default',
      tooltip,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Tag
        ref={ref}
        data-active={isActive}
        className={cn(
          'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
          variant === 'outline' &&
            'shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-ring)]',
          size === 'sm' && 'text-xs h-7',
          size === 'lg' && 'h-12 text-sm',
          className,
        )}
        title={tooltip}
        {...props}
      >
        {children}
      </Tag>
    )
  },
)
SidebarMenuButton.displayName = 'SidebarMenuButton'

export function SidebarInset({ className, ...props }) {
  return (
    <main
      className={cn(
        'relative flex min-h-svh flex-1 flex-col bg-background transition-all group-has-[[data-variant=inset]]/sidebar-wrapper:m-2 group-has-[[data-variant=inset]]/sidebar-wrapper:rounded-xl group-has-[[data-variant=inset]]/sidebar-wrapper:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
