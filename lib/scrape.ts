// Shared URL scraping utility — used by blocks, achievements, affiliations

export interface ScrapeResult {
  title?: string
  description?: string
  text?: string
  og_image?: string
}

function extractMeta(html: string, property: string): string | null {
  return (
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'))?.[1] ??
    null
  )
}

function extractNameMeta(html: string, name: string): string | null {
  return (
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))?.[1] ??
    null
  )
}

function extractPageText(html: string, maxChars = 3000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxChars)
}

export async function scrapeUrl(url: string, timeoutMs = 8000): Promise<ScrapeResult> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Myntrobot/1.0 (link preview)' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    if (!res.ok) return {}
    const html = await res.text()

    const title =
      extractMeta(html, 'og:title') ??
      extractNameMeta(html, 'twitter:title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      undefined

    const description =
      extractMeta(html, 'og:description') ??
      extractNameMeta(html, 'twitter:description') ??
      extractNameMeta(html, 'description') ??
      undefined

    const og_image =
      extractMeta(html, 'og:image') ??
      extractNameMeta(html, 'twitter:image') ??
      undefined

    const text = extractPageText(html) || undefined

    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(og_image ? { og_image } : {}),
      ...(text ? { text } : {}),
    }
  } catch {
    return {}
  }
}
