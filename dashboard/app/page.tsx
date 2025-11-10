import Link from "next/link"

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-foreground">Dashboard</h1>
      <p className="text-16 text-muted-foreground">
        Welcome to the Theodore ポピトのPhD dashboard. Use the sidebar to navigate.
      </p>
      <div className="grid gap-4 md:grid-cols-2 mt-8">
        <Link
          href="/stats"
          className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="text-h4 text-card-foreground mb-2">Stats</h2>
          <p className="text-14 text-muted-foreground">
            View all chapters configured in the project
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
    </div>
  )
}
