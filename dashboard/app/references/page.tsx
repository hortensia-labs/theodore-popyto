import { getAllReferences } from "@/lib/sections"

export default async function ReferencesPage() {
  const allReferences = await getAllReferences()

  const totalUrls = allReferences.reduce(
    (sum, ref) => sum + ref.urls.length,
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 text-foreground">References</h1>
        <p className="text-16 text-muted-foreground mt-2">
          Total URLs: {totalUrls} across {allReferences.length} sections
        </p>
      </div>

      <div className="space-y-8">
        {allReferences.map(({ section, urls }) => (
          <div key={section} className="space-y-3">
            <h2 className="text-h4 text-foreground">
              {section} ({urls.length} URLs)
            </h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <ul className="space-y-2">
                {urls.map((url, index) => (
                  <li key={index} className="text-14">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {allReferences.length === 0 && (
          <p className="text-16 text-muted-foreground">
            No references found. Make sure sections have references/urls.json
            files.
          </p>
        )}
      </div>
    </div>
  )
}

