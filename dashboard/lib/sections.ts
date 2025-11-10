import { readdir, readFile } from "fs/promises"
import { join } from "path"

// Get the path to sections folder (one level up from dashboard)
const SECTIONS_PATH = join(process.cwd(), "..", "sections")

export interface Section {
  name: string
  path: string
  hasReferences: boolean
}

export async function getSections(): Promise<Section[]> {
  try {
    const entries = await readdir(SECTIONS_PATH, { withFileTypes: true })
    const sections: Section[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sectionPath = join(SECTIONS_PATH, entry.name)
        const referencesPath = join(sectionPath, "references", "urls.json")
        
        let hasReferences = false
        try {
          await readFile(referencesPath, "utf-8")
          hasReferences = true
        } catch {
          // File doesn't exist, which is fine
        }

        sections.push({
          name: entry.name,
          path: sectionPath,
          hasReferences,
        })
      }
    }

    return sections.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error("Error reading sections:", error)
    return []
  }
}

export async function getSectionReferences(sectionName: string): Promise<string[]> {
  try {
    const referencesPath = join(
      SECTIONS_PATH,
      sectionName,
      "references",
      "urls.json"
    )
    const content = await readFile(referencesPath, "utf-8")
    const urls = JSON.parse(content)
    return Array.isArray(urls) ? urls : []
  } catch (error) {
    console.error(`Error reading references for ${sectionName}:`, error)
    return []
  }
}

export async function getAllReferences(): Promise<
  Array<{ section: string; urls: string[] }>
> {
  const sections = await getSections()
  const references: Array<{ section: string; urls: string[] }> = []

  for (const section of sections) {
    if (section.hasReferences) {
      const urls = await getSectionReferences(section.name)
      if (urls.length > 0) {
        references.push({ section: section.name, urls })
      }
    }
  }

  return references
}

