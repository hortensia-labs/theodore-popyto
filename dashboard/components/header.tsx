"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

// Route to title mapping
const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/urls": "URL Management",
  "/analytics": "Processing Analytics",
  "/stats": "Stats",
  "/references": "References",
  "/demo/pdf-identifier-extractor": "PDF Identifier Extractor",
}

// Helper to get title from pathname
function getPageTitle(pathname: string): string {
  // Check exact matches first
  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }
  
  // Handle dynamic routes
  if (pathname.startsWith("/urls/") && pathname.includes("/llm-extract")) {
    return "LLM Metadata Extraction"
  }
  
  // Fallback: capitalize and format the pathname
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length > 0) {
    return segments
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" / ")
  }
  
  return "テオドール"
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <header
      className={cn(
        "flex items-center justify-between border-b border-border bg-background px-6 py-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <h1 className="text-h3 text-foreground">テオドール</h1>
        {pageTitle !== "テオドール" && (
          <>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-h4 text-foreground font-medium">{pageTitle}</h2>
          </>
        )}
      </div>
    </header>
  )
}

