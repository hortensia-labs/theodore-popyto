import Link from "next/link"
import { StatsOverview } from "@/components/stats-overview"
import { ProcessUrlsButton } from "@/components/process-urls-button"

export default async function Home() {
  
  return (
    <div className="space-y-8 mx-4">
      <div className="flex items-start justify-between mt-4">
        <div>
          <h1 className="text-h2 text-foreground">Theodore Dashboard</h1>
        </div>
        <ProcessUrlsButton />
      </div>
      
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/urls/new"
          className="rounded-lg border-2 border-green-500 bg-green-50 p-6 hover:bg-green-100 transition-colors relative"
        >
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
            NEW
          </div>
          <h2 className="text-h4 text-card-foreground mb-2">URL Management (New)</h2>
          <p className="text-14 text-muted-foreground">
            Refactored system with 12-state workflow, auto-cascade, smart suggestions
          </p>
        </Link>
        <Link
          href="/analytics"
          className="rounded-lg border-2 border-blue-500 bg-blue-50 p-6 hover:bg-blue-100 transition-colors relative"
        >
          <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
            NEW
          </div>
          <h2 className="text-h4 text-card-foreground mb-2">Processing Analytics</h2>
          <p className="text-14 text-muted-foreground">
            Charts, metrics, and export for processing insights
          </p>
        </Link>
        <Link
          href="/urls"
          className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="text-h4 text-card-foreground mb-2">URL Management (Legacy)</h2>
          <p className="text-14 text-muted-foreground">
            Original system for comparison
          </p>
        </Link>
      </div>
      
      {/* Additional Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/stats"
          className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="text-h4 text-card-foreground mb-2">Detailed Stats</h2>
          <p className="text-14 text-muted-foreground">
            View detailed statistics and analytics
          </p>
        </Link>
        <Link
          href="/references"
          className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="text-h4 text-card-foreground mb-2">References</h2>
          <p className="text-14 text-muted-foreground">
            Browse all URLs from section references
          </p>
        </Link>
      </div>
      
      {/* Stats Overview */}
      <div className="pb-16">
        <h2 className="text-h3 text-foreground mb-4">Overview</h2>
        <StatsOverview />
      </div>
    </div>
  )
}
