import * as React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  Camera,
  FileText,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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

gsap.registerPlugin(useGSAP, ScrollTrigger)

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
  const contentRef = React.useRef(null)
  const footerRef = React.useRef(null)

  // GSAP Route Transition: smooth fade and subtle slide on location change
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (!contentRef.current) return

      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
      )
    },
    { dependencies: [location.pathname] },
  )

  // GSAP ScrollTrigger for footer reveal
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!footerRef.current) return

    ScrollTrigger.create({
      trigger: footerRef.current,
      start: 'top bottom-=50',
      onEnter: () => {
        gsap.fromTo(
          footerRef.current,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        )
      },
      once: true,
    })
  }, [])

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
                        className="group/btn hover:translate-x-0.5 active:scale-[0.98] transition-all duration-150"
                      >
                        <Icon className="size-4 group-hover/btn:scale-110 group-hover/btn:text-primary transition-transform duration-200" />
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
                className="text-sidebar-foreground/70 hover:text-destructive hover:scale-105 active:scale-95 transition-transform"
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
              <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] py-0 px-2 gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:inline-flex text-xs h-8 hover:border-destructive/50 hover:text-destructive active:scale-[0.98] transition-all"
            >
              Log out
            </Button>
          </div>
        </header>

        {/* Content Body with GSAP Route Transition */}
        <div ref={contentRef} className="flex-1 p-4 sm:p-6 max-w-360 w-full mx-auto">
          <Outlet />
        </div>

        {/* Footer with GSAP ScrollTrigger reveal */}
        <footer ref={footerRef} className="mt-auto border-t border-border bg-card/40 py-6">
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
                className="transition duration-300 hover:text-foreground hover:underline underline-offset-4"
              >
                Scanner
              </NavLink>
              <NavLink
                to="/logs"
                className="transition duration-300 hover:text-foreground hover:underline underline-offset-4"
              >
                Logs
              </NavLink>
              <NavLink
                to="/manager"
                className="transition duration-300 hover:text-foreground hover:underline underline-offset-4"
              >
                Manager
              </NavLink>
              <NavLink
                to="/electric-border"
                className="transition duration-300 hover:text-foreground hover:underline underline-offset-4"
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
