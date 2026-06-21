export type ArticleStatus = 'draft' | 'published' | 'failed'
export type ArticleSource = 'ai' | 'rss' | 'manual'

export interface ArticleMeta {
  id: string
  title: string
  createdAt: string
  source: ArticleSource
  status: ArticleStatus
  scheduledAt?: string
  publishedAt?: string
  wechatMediaId?: string
  wechatUrl?: string
  error?: string
  summary?: string
  tags?: string[]
}

export interface Article extends ArticleMeta {
  content: string
}

export interface RssSource {
  id: string
  name: string
  url: string
  enabled: boolean
  interval: number
  lastFetchedAt?: string
}

export interface ScheduleConfig {
  cron: string
  enabled: boolean
  maxArticlesPerRun: number
  preferredTopics: string[]
}

export interface AppConfig {
  deepseek: {
    apiKey: string
    baseUrl: string
    model: string
  }
  image: {
    apiKey: string
    baseUrl: string
    model: string
  }
  wechat: {
    appId: string
    appSecret: string
  }
  server: {
    port: number
  }
  schedule: ScheduleConfig
}

export interface WechatToken {
  accessToken: string
  expiresAt: number
}
