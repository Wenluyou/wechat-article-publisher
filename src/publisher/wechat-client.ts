import { appConfig } from '../config'
import { logger } from '../utils/logger'
import type { WechatToken } from '../types'

let tokenCache: WechatToken | null = null

const API_BASE = 'https://api.weixin.qq.com/cgi-bin'

async function fetchToken(): Promise<string> {
  const { appId, appSecret } = appConfig.wechat
  if (!appId || !appSecret) {
    throw new Error('WeChat AppID or AppSecret not configured')
  }
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken
  }
  const url = `${API_BASE}/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  const resp = await fetch(url)
  const data: any = await resp.json()
  if (data.errcode) {
    throw new Error(`WeChat token error: ${data.errmsg} (${data.errcode})`)
  }
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  logger.info('WeChat access token refreshed')
  return data.access_token
}

async function apiPost(path: string, body: Record<string, unknown>): Promise<any> {
  const token = await fetchToken()
  const url = `${API_BASE}${path}?access_token=${token}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data: any = await resp.json()
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error: ${data.errmsg} (${data.errcode})`)
  }
  return data
}

export interface WechatNewsArticle {
  title: string
  content: string
  digest?: string
  thumbMediaId?: string
  needOpenComment?: number
  onlyFansCanComment?: number
}

export async function createDraft(article: WechatNewsArticle): Promise<string> {
  logger.info(`Creating WeChat draft: ${article.title}`)
  const body = {
    articles: [
      {
        title: article.title,
        content: article.content,
        digest: article.digest || article.title,
        thumb_media_id: article.thumbMediaId || '',
        need_open_comment: article.needOpenComment ?? 1,
        only_fans_can_comment: article.onlyFansCanComment ?? 0,
      },
    ],
  }
  const data = await apiPost('/draft/add', body)
  const mediaId = data.media_id
  logger.info(`WeChat draft created: ${mediaId}`)
  return mediaId
}

export async function publishDraft(draftId: string): Promise<string> {
  logger.info(`Publishing draft: ${draftId}`)
  const data = await apiPost('/freepublish/submit', { media_id: draftId })
  const publishId = data.publish_id
  logger.info(`WeChat publish submitted: ${publishId}`)
  return publishId
}

export async function getPublishStatus(publishId: string): Promise<{ status: string; url?: string }> {
  const data = await apiPost('/freepublish/get', { publish_id: publishId })
  const status = data.publish_status === 0 ? 'pending'
    : data.publish_status === 1 ? 'success'
    : data.publish_status === 2 ? 'failed' : 'unknown'
  const url = data.article_url || data?.article_detail?.link || undefined
  return { status, url }
}
