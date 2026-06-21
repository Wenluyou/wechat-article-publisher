import { Router } from 'express'
import { getSchedule, saveSchedule, getRssSources, saveRssSources } from '../config'
import { restartScheduler, runPipeline } from '../scheduler'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req, res) => {
  const schedule = getSchedule()
  const rssSources = getRssSources()
  res.render('settings', { schedule, rssSources })
})

router.post('/schedule', (req, res) => {
  const { cron, enabled, maxArticlesPerRun, preferredTopics } = req.body
  saveSchedule({
    cron: cron || '0 8 * * *',
    enabled: enabled === 'on' || enabled === true,
    maxArticlesPerRun: parseInt(maxArticlesPerRun || '1', 10),
    preferredTopics: preferredTopics ? preferredTopics.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
  })
  restartScheduler()
  res.redirect('/settings')
})

router.post('/rss/add', (req, res) => {
  const { name, url, interval } = req.body
  const sources = getRssSources()
  sources.push({
    id: uuidv4(),
    name,
    url,
    enabled: true,
    interval: parseInt(interval || '60', 10),
  })
  saveRssSources(sources)
  res.redirect('/settings')
})

router.post('/rss/:id/delete', (req, res) => {
  const sources = getRssSources().filter(s => s.id !== req.params.id)
  saveRssSources(sources)
  res.redirect('/settings')
})

router.post('/rss/:id/toggle', (req, res) => {
  const sources = getRssSources().map(s => {
    if (s.id === req.params.id) s.enabled = !s.enabled
    return s
  })
  saveRssSources(sources)
  res.redirect('/settings')
})

router.post('/pipeline/run', async (req, res) => {
  const schedule = getSchedule()
  await runPipeline(schedule.maxArticlesPerRun, schedule.preferredTopics)
  res.redirect('/')
})

export default router
