import Link from "next/link"
import { StatsOverview } from "@/components/stats-overview"
import { ProcessUrlsButton } from "@/components/process-urls-button"

export default async function Home() {
  
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h2 text-foreground">Theodore Dashboard</h1>
          <p className="text-16 text-muted-foreground mt-2">
            Manage and enrich URLs from your thesis research
          </p>
        </div>
        <ProcessUrlsButton />
      </div>
      
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/urls"
          className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="text-h4 text-card-foreground mb-2">URL Management</h2>
          <p className="text-14 text-muted-foreground">
            View, filter, and enrich URLs with custom identifiers
          </p>
        </Link>
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
      <div>
        <h2 className="text-h3 text-foreground mb-4">Overview</h2>
        <StatsOverview />
      </div>
    </div>
  )
}
