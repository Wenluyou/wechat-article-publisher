import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import type { AppConfig, RssSource, ScheduleConfig } from './types'

dotenv.config()

const configDir = path.resolve(__dirname, '..', 'config')

function ensureConfigDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

function loadJson<T>(name: string, defaults: T): T {
  const filePath = path.join(configDir, `${name}.json`)
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch { }
  }
  return defaults
}

function saveJson<T>(name: string, data: T): void {
  ensureConfigDir()
  const filePath = path.join(configDir, `${name}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const defaultSchedule: ScheduleConfig = {
  cron: '0 8 * * *',
  enabled: false,
  maxArticlesPerRun: 1,
  preferredTopics: [],
}

const defaultRssSources: RssSource[] = []

export const appConfig: AppConfig = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  image: {
    apiKey: process.env.AGNES_IMAGE_API_KEY || '',
    baseUrl: process.env.AGNES_IMAGE_BASE_URL || 'https://apihub.agnes-ai.com',
    model: process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.1-flash',
  },
  wechat: {
    appId: process.env.WECHAT_APPID || '',
    appSecret: process.env.WECHAT_APPSECRET || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  schedule: loadJson<ScheduleConfig>('schedule', defaultSchedule),
}

export function getSchedule(): ScheduleConfig {
  return loadJson<ScheduleConfig>('schedule', defaultSchedule)
}

export function saveSchedule(schedule: ScheduleConfig): void {
  saveJson('schedule', schedule)
  appConfig.schedule = schedule
}

export function getRssSources(): RssSource[] {
  return loadJson<RssSource[]>('rss-sources', defaultRssSources)
}

export function saveRssSources(sources: RssSource[]): void {
  saveJson('rss-sources', sources)
}
