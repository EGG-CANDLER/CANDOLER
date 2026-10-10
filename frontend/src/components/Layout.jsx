import * as React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  Camera,
  FileText,
  FlaskConical,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { Avatar, AvatarBadge, AvatarFallback } from './ui/avatar'
import { BackgroundRipple } from './ui/BackgroundRipple'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ModeToggle } from './ui/ModeToggle'
import { ScrollToTop } from './ui/ScrollToTop'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar'
import Logo from './Logo'

const NAV_ITEMS = [
  { to: '/', label: 'Scanner', icon: Camera, exact: true },
  { to: '/logs', label: 'Detection Logs', icon: FileText },
  { to: '/archives', label: 'Archive', icon: Archive },
  { to: '/manager', label: 'Manager Console', icon: Shield },
  { to: '/electric-border', label: 'FX Lab', icon: Sparkles },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const userInitial = user?.email ? user.email.slice(0, 2).toUpperCase() : 'OP'

  const currentPageTitle = React.useMemo(() => {
    const current = NAV_ITEMS.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )
    return current?.label || 'Dashboard'
  }, [location.pathname])

  return (
    <SidebarProvider defaultOpen={true}>
      <BackgroundRipple />

      {/* Main App Sidebar */}
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/60 pb-3">
          <div className="flex items-center gap-3 px-1">
            <Logo size={32} />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                Egg Candling
              </span>
              <span className="text-[11px] text-sidebar-foreground/70">
                AI Vision System
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = item.exact
                    ? location.pathname === item.to
                    : location.pathname === item.to ||
                      (item.to !== '/' && location.pathname.startsWith(item.to))
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        as={NavLink}
                        to={item.to}
                        isActive={active}
                        tooltip={item.label}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60 pt-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar size="sm">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground font-mono text-xs">
                  {userInitial}
                </AvatarFallback>
                <AvatarBadge />
              </Avatar>
              <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span
                  className="truncate text-xs font-medium text-sidebar-foreground"
                  title={user?.email || ''}
                >
                  {user?.email || 'operator'}
                </span>
                <span className="text-[10px] text-sidebar-foreground/60">
                  Active Operator
                </span>
              </div>
            </div>

            <div className="group-data-[collapsible=icon]:hidden">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleLogout}
                title="Log out"
                className="text-sidebar-foreground/70 hover:text-destructive"
              >
                <LogOut className="size-3.5" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area (SidebarInset) */}
      <SidebarInset>
        {/* Sticky Header: max-w-360 */}
        <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-md border-b border-border max-w-360 w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {currentPageTitle}
              </span>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] py-0 px-2">
                Live
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:inline-flex text-xs h-8"
            >
              Log out
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 max-w-360 w-full mx-auto">
          <Outlet />
        </div>

        {/* Footer: max-w-360 container, responsive flex → column on max-sm */}
        <footer className="mt-auto border-t border-border bg-card/40 py-6">
          <div className="max-w-360 container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Logo size={18} />
              <span>
                CANDOLER &copy; 2026 &mdash; AI-Powered Egg Candling & Incubation Vision System
              </span>
            </div>
            <div className="flex items-center gap-4 text-center sm:text-right">
              <NavLink
                to="/"
                className="transition duration-300 hover:text-foreground"
              >
                Scanner
              </NavLink>
              <NavLink
                to="/logs"
                className="transition duration-300 hover:text-foreground"
              >
                Logs
              </NavLink>
              <NavLink
                to="/manager"
                className="transition duration-300 hover:text-foreground"
              >
                Manager
              </NavLink>
              <NavLink
                to="/electric-border"
                className="transition duration-300 hover:text-foreground"
              >
                FX Lab
              </NavLink>
            </div>
          </div>
        </footer>

        <ScrollToTop />
      </SidebarInset>
    </SidebarProvider>
  )
}
