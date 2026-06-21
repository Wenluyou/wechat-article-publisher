import express from 'express'
import cors from 'cors'
import path from 'path'
import layouts from 'express-ejs-layouts'
import { appConfig } from './config'
import { logger } from './utils/logger'
import { startScheduler } from './scheduler'
import dashboardRouter from './routes/dashboard'
import articlesRouter from './routes/articles'
import settingsRouter from './routes/settings'

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname, '..', 'views'))
app.use(layouts)
app.set('layout', 'layout')

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.resolve(__dirname, '..', 'public')))

app.use('/', dashboardRouter)
app.use('/articles', articlesRouter)
app.use('/settings', settingsRouter)

app.listen(appConfig.server.port, () => {
  logger.info(`Server running on http://localhost:${appConfig.server.port}`)
  startScheduler()
})
