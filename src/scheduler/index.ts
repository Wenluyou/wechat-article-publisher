import cron from 'node-cron'
import { getSchedule } from '../config'
import { logger } from '../utils/logger'
import { generateByTopic } from '../generator/ai'
import { fetchAllSources } from '../generator/rss'
import { rewriteArticle } from '../generator/ai'
import { listArticles, saveArticle } from '../storage'
import { publishArticle } from '../publisher'

let task: cron.ScheduledTask | null = null

export function startScheduler() {
  const schedule = getSchedule()
  if (!schedule.enabled) {
    logger.info('Scheduler is disabled')
    return
  }
  if (task) {
    task.stop()
  }
  logger.info(`Starting scheduler with cron: ${schedule.cron}`)
  task = cron.schedule(schedule.cron, async () => {
    logger.info('Scheduler triggered')
    await runPipeline(schedule.maxArticlesPerRun, schedule.preferredTopics)
  })
}

export function stopScheduler() {
  if (task) {
    task.stop()
    task = null
    logger.info('Scheduler stopped')
  }
}

export function restartScheduler() {
  stopScheduler()
  startScheduler()
}

export async function runPipeline(maxArticles: number, topics: string[]): Promise<void> {
  logger.info(`Running pipeline: maxArticles=${maxArticles}, topics=${topics.join(', ')}`)

  const drafts = listArticles('draft')
  const queued = drafts.filter(a => a.scheduledAt && new Date(a.scheduledAt) <= new Date())

  if (queued.length > 0) {
    logger.info(`Found ${queued.length} queued articles to publish`)
    for (const article of queued.slice(0, maxArticles)) {
      const ok = await publishArticle(article.id)
      logger.info(`Publish ${article.title}: ${ok ? 'OK' : 'FAILED'}`)
    }
    return
  }

  if (topics.length > 0) {
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const article = await generateByTopic(topic)
    if (article) {
      saveArticle(article)
      logger.info(`Generated article: ${article.title}`)
      const ok = await publishArticle(article.id)
      logger.info(`Publish ${article.title}: ${ok ? 'OK' : 'FAILED'}`)
    }
    return
  }

  const sources = await fetchAllSources(1)
  if (sources.length > 0) {
    for (const { source, items } of sources) {
      if (items.length === 0) continue
      const article = await rewriteArticle(items[0].content, source)
      if (article) {
        saveArticle(article)
        logger.info(`Rewrote article from ${source}: ${article.title}`)
        const ok = await publishArticle(article.id)
        logger.info(`Publish ${article.title}: ${ok ? 'OK' : 'FAILED'}`)
        break
      }
    }
    return
  }

  const fallbackTopics = ['人工智能趋势', '效率工具推荐', '编程最佳实践', '科技生活']
  const fallback = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)]
  const article = await generateByTopic(fallback)
  if (article) {
    saveArticle(article)
    logger.info(`Generated fallback article: ${article.title}`)
    const ok = await publishArticle(article.id)
    logger.info(`Publish ${article.title}: ${ok ? 'OK' : 'FAILED'}`)
  }
}
