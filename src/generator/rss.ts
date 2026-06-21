import Parser from 'rss-parser'
import * as cheerio from 'cheerio'
import { logger } from '../utils/logger'
import { getRssSources } from '../config'

const parser = new Parser()

interface RssItem {
  title: string
  link: string
  content: string
  pubDate: string
}

export async function fetchRssItems(sourceUrl: string, maxItems = 5): Promise<RssItem[]> {
  try {
    logger.info(`Fetching RSS: ${sourceUrl}`)
    const feed = await parser.parseURL(sourceUrl)
    const items: RssItem[] = []
    for (const entry of feed.items?.slice(0, maxItems) || []) {
      const html = entry['content:encoded'] || entry.content || entry.contentSnippet || ''
      items.push({
        title: entry.title || '无标题',
        link: entry.link || '',
        content: htmlToText(html),
        pubDate: entry.pubDate || entry.isoDate || new Date().toISOString(),
      })
    }
    logger.info(`Fetched ${items.length} items from ${sourceUrl}`)
    return items
  } catch (e) {
    logger.error(`Failed to fetch RSS ${sourceUrl}:`, e)
    return []
  }
}

export async function fetchAllSources(maxPerSource = 3): Promise<{ source: string; items: RssItem[] }[]> {
  const sources = getRssSources().filter(s => s.enabled)
  const results: { source: string; items: RssItem[] }[] = []
  for (const source of sources) {
    const items = await fetchRssItems(source.url, maxPerSource)
    if (items.length > 0) {
      results.push({ source: source.name, items })
    }
  }
  return results
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, aside').remove()
  let text = $.text()
  text = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim()
  if (text.length > 3000) {
    text = text.slice(0, 3000) + '...'
  }
  return text
}
