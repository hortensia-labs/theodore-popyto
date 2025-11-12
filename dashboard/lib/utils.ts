import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a URL to remove protocol and www prefix
 * Returns just the domain and path
 * Example: "https://www.example.com/path" -> "example.com/path"
 */
export function formatUrlForDisplay(url: string): string {
  try {
    const urlObj = new URL(url)
    let hostname = urlObj.hostname
    
    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    
    // Combine hostname and pathname
    const path = urlObj.pathname + urlObj.search + urlObj.hash
    return hostname + path
  } catch {
    // If URL parsing fails, try simple string replacement
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
  }
}

