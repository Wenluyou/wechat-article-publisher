import { logger } from '../utils/logger'
import { getArticle, updateArticleStatus } from '../storage'
import { markdownToWechatHtml } from './formatter'
import * as wechat from './wechat-client'

export async function publishArticle(articleId: string): Promise<boolean> {
  const article = getArticle(articleId)
  if (!article) {
    logger.error(`Article not found: ${articleId}`)
    return false
  }
  if (article.status === 'published') {
    logger.warn(`Article already published: ${article.title}`)
    return true
  }
  try {
    const htmlContent = markdownToWechatHtml(article.content)
    const draftId = await wechat.createDraft({
      title: article.title,
      content: htmlContent,
    })
    updateArticleStatus(articleId, 'draft', { wechatMediaId: draftId })
    const publishId = await wechat.publishDraft(draftId)
    let retries = 0
    const checkStatus = async (): Promise<string | undefined> => {
      for (let i = 0; i < 12; i++) {
        await sleep(10000)
        const result = await wechat.getPublishStatus(publishId)
        if (result.status === 'success') return result.url
        if (result.status === 'failed') return undefined
      }
      return undefined
    }
    const url = await checkStatus()
    if (url) {
      updateArticleStatus(articleId, 'published', {
        publishedAt: new Date().toISOString(),
        wechatUrl: url,
      })
      logger.info(`Article published: ${article.title} -> ${url}`)
      return true
    } else {
      updateArticleStatus(articleId, 'failed', { error: 'Publish check timed out or failed' })
      return false
    }
  } catch (e: any) {
    logger.error(`Publish failed for ${article.title}:`, e.message)
    updateArticleStatus(articleId, 'failed', { error: e.message })
    return false
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
