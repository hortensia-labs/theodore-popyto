import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center border-b border-border bg-background px-6 py-4",
        className
      )}
    >
      <h1 className="text-h3 text-foreground">Theodore ポピトのPhD</h1>
    </header>
  )
}

