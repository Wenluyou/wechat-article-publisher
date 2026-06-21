import OpenAI from 'openai'
import { appConfig } from '../config'
import { logger } from '../utils/logger'
import type { Article } from '../types'
import { createArticle } from '../storage'

const client = new OpenAI({
  apiKey: appConfig.deepseek.apiKey,
  baseURL: appConfig.deepseek.baseUrl,
})

const SYSTEM_PROMPT = `你是一个微信公众号文章作者。请根据用户提供的主题，写一篇适合公众号发布的文章。

要求：
- 标题吸引眼球，适合公众号传播
- 开头有吸引力，能抓住读者注意力
- 内容结构清晰，使用小标题分段
- 语言通俗易懂，适合大众阅读
- 结尾有总结或互动引导
- 全文1500-2500字
- 用 Markdown 格式输出
- 第一行是标题（以 # 开头），空一行后是正文`

export async function generateByTopic(topic: string): Promise<Article | null> {
  try {
    logger.info(`Generating article for topic: ${topic}`)
    const resp = await client.chat.completions.create({
      model: appConfig.deepseek.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请写一篇关于「${topic}」的公众号文章。` },
      ],
      temperature: 0.8,
      max_tokens: 4096,
    })
    const content = resp.choices[0]?.message?.content?.trim()
    if (!content) {
      logger.warn('AI returned empty content')
      return null
    }

    const lines = content.split('\n')
    const titleLine = lines.find(l => l.startsWith('# '))
    const title = titleLine ? titleLine.replace(/^#\s*/, '').trim() : `关于${topic}`
    const body = content.replace(/^#\s.*\n?/, '').trim()
    const article = createArticle(title, body, 'ai')
    return article
  } catch (e) {
    logger.error(`AI generation failed for topic "${topic}":`, e)
    return null
  }
}

export async function generateByOutline(outline: string): Promise<Article | null> {
  try {
    logger.info(`Generating article from outline: ${outline.slice(0, 50)}...`)
    const resp = await client.chat.completions.create({
      model: appConfig.deepseek.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请根据以下大纲写一篇公众号文章：\n\n${outline}` },
      ],
      temperature: 0.8,
      max_tokens: 4096,
    })
    const content = resp.choices[0]?.message?.content?.trim()
    if (!content) {
      logger.warn('AI returned empty content')
      return null
    }
    const lines = content.split('\n')
    const titleLine = lines.find(l => l.startsWith('# '))
    const title = titleLine ? titleLine.replace(/^#\s*/, '').trim() : '未命名文章'
    const body = content.replace(/^#\s.*\n?/, '').trim()
    const article = createArticle(title, body, 'ai')
    return article
  } catch (e) {
    logger.error('AI generation failed for outline:', e)
    return null
  }
}

export async function rewriteArticle(sourceText: string, sourceName: string): Promise<Article | null> {
  try {
    logger.info(`Rewriting article from ${sourceName}`)
    const resp = await client.chat.completions.create({
      model: appConfig.deepseek.model,
      messages: [
        {
          role: 'system',
          content: `你是一个公众号编辑。请将下面的内容改写成一篇适合公众号发布的原创文章。
要求：
- 重新组织语言和结构，不能直接复制
- 提取核心信息，补充相关背景
- 语言通俗易懂，适合大众阅读
- 使用小标题分段
- 用 Markdown 格式输出
- 第一行是标题（以 # 开头）`,
        },
        { role: 'user', content: sourceText },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    })
    const content = resp.choices[0]?.message?.content?.trim()
    if (!content) {
      logger.warn('AI returned empty content for rewrite')
      return null
    }
    const lines = content.split('\n')
    const titleLine = lines.find(l => l.startsWith('# '))
    const title = titleLine ? titleLine.replace(/^#\s*/, '').trim() : `改写：${sourceName}`
    const body = content.replace(/^#\s.*\n?/, '').trim()
    const article = createArticle(title, body, 'rss')
    return article
  } catch (e) {
    logger.error(`Rewrite failed for ${sourceName}:`, e)
    return null
  }
}
