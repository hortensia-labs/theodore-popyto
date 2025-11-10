import { getSections } from "@/lib/sections"

export default async function StatsPage() {
  const sections = await getSections()

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-foreground">Stats</h1>
      <div className="space-y-4">
        <h2 className="text-h4 text-foreground">Chapters</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.name}
              className="rounded-lg border border-border bg-card p-4"
            >
              <h3 className="text-h6 text-card-foreground mb-2">
                {section.name}
              </h3>
              <div className="text-14 text-muted-foreground">
                {section.hasReferences ? (
                  <span className="text-green-600">Has references</span>
                ) : (
                  <span className="text-muted-foreground">No references</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {sections.length === 0 && (
          <p className="text-16 text-muted-foreground">
            No chapters found in sections folder.
          </p>
        )}
      </div>
    </div>
  )
}

