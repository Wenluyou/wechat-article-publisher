import { Router } from 'express'
import { listArticles } from '../storage'
import { getSchedule, getRssSources } from '../config'

const router = Router()

router.get('/', (req, res) => {
  const articles = listArticles()
  const schedule = getSchedule()
  const rssSources = getRssSources()
  const stats = {
    total: articles.length,
    draft: articles.filter(a => a.status === 'draft').length,
    published: articles.filter(a => a.status === 'published').length,
    failed: articles.filter(a => a.status === 'failed').length,
  }
  const lastPublished = articles.find(a => a.status === 'published')
  res.render('dashboard', {
    stats,
    articles: articles.slice(0, 10),
    schedule,
    rssSources,
    lastPublished,
  })
})

export default router
