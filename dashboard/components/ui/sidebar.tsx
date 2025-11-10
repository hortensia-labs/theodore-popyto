"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const menuItems = [
    {
      label: "Dashboard",
      href: "/",
    },
    {
      label: "Stats",
      href: "/stats",
    },
    {
      label: "References",
      href: "/references",
    },
  ]

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar p-6",
        className
      )}
    >
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-16 px-4 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

