import * as React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  Camera,
  FileText,
  LogOut,
  Shield,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { useAuth } from '../context/AuthContext'
import { Avatar, AvatarBadge, AvatarFallback } from './ui/avatar'
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
import farmEggThumbnail from '../images/chicken-eggs-wooden-table-background-farm-chickens-342155306.webp'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const NAV_ITEMS = [
  { to: '/', label: 'Scanner', icon: Camera, exact: true },
  { to: '/logs', label: 'Detection Logs', icon: FileText },
  { to: '/archives', label: 'Archive', icon: Archive },
  { to: '/manager', label: 'Manager Console', icon: Shield },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const contentRef = React.useRef(null)
  const footerRef = React.useRef(null)

  // GSAP Route Transition: smooth subtle fade
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (!contentRef.current) return

      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
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
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
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
      {/* Main App Sidebar */}
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border pb-3">
          <div className="flex items-center gap-3 px-1">
            <Logo size={32} />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                Egg Candling
              </span>
              <span className="text-[11px] text-muted-foreground">
                AI Vision Console
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              Operations
            </SidebarGroupLabel>
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
                        className={
                          active
                            ? 'bg-[#1E4D2B] text-white dark:bg-[#52B788] dark:text-[#09150D] font-medium shadow-xs'
                            : 'hover:bg-accent hover:text-accent-foreground text-foreground/80'
                        }
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

          {/* Sidebar Agribusiness Visual Badge (Collapsible) */}
          <div className="mt-auto px-3 py-2 group-data-[collapsible=icon]:hidden">
            <div className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-3 shadow-xs">
              <img
                src={farmEggThumbnail}
                alt="Poultry farm"
                className="size-10 rounded-md object-cover border border-border/80 shrink-0"
              />
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-foreground block truncate">
                  Farm Unit 04
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  Standard Candler Online
                </span>
              </div>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border pt-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar size="sm">
                <AvatarFallback className="bg-secondary text-secondary-foreground font-mono text-xs">
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
                <span className="text-[10px] text-muted-foreground">
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
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
        {/* Sticky Header: clean off-white / white surface */}
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border max-w-360 w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {currentPageTitle}
              </span>
              <Badge variant="leaf" className="hidden sm:inline-flex text-[11px] py-0 px-2 gap-1.5">
                <span className="size-1.5 rounded-full bg-[#52B788] animate-pulse" /> Live System
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:inline-flex text-xs h-8 hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              Log out
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <div ref={contentRef} className="flex-1 p-4 sm:p-6 max-w-360 w-full mx-auto">
          <Outlet />
        </div>

        {/* Footer */}
        <footer ref={footerRef} className="mt-auto border-t border-border bg-card/60 py-5">
          <div className="max-w-360 container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Logo size={18} />
              <span>
                CANDOLER &copy; 2026 &mdash; AI-Powered Poultry Incubation & Development Intelligence
              </span>
            </div>
            <div className="flex items-center gap-4 text-center sm:text-right">
              <NavLink
                to="/"
                className="transition-colors hover:text-foreground hover:underline underline-offset-4"
              >
                Scanner
              </NavLink>
              <NavLink
                to="/logs"
                className="transition-colors hover:text-foreground hover:underline underline-offset-4"
              >
                Logs
              </NavLink>
              <NavLink
                to="/manager"
                className="transition-colors hover:text-foreground hover:underline underline-offset-4"
              >
                Manager
              </NavLink>
            </div>
          </div>
        </footer>

        <ScrollToTop />
      </SidebarInset>
    </SidebarProvider>
  )
}
