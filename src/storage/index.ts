import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import type { Article, ArticleMeta, ArticleStatus } from '../types'
import { logger } from '../utils/logger'

const articlesDir = path.resolve(__dirname, '..', '..', 'articles')

function ensureDir(subdir: string): string {
  const dir = path.join(articlesDir, subdir)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function statusDir(status: ArticleStatus): string {
  return ensureDir(status === 'draft' ? 'drafts' : status === 'published' ? 'published' : 'failed')
}

export function saveArticle(article: Article): void {
  const dir = statusDir(article.status)
  const filePath = path.join(dir, `${article.id}.md`)
  const { content, ...meta } = article
  const fileContent = matter.stringify(content, meta)
  fs.writeFileSync(filePath, fileContent, 'utf-8')
  logger.info(`Article saved: ${article.title} (${article.id})`)
}

export function getArticle(id: string): Article | null {
  for (const status of ['drafts', 'published', 'failed'] as const) {
    const filePath = path.join(articlesDir, status, `${id}.md`)
    if (fs.existsSync(filePath)) {
      const parsed = matter.read(filePath)
      return {
        ...parsed.data as ArticleMeta,
        content: parsed.content,
      }
    }
  }
  return null
}

export function listArticles(status?: ArticleStatus): Article[] {
  const dirs = status ? [statusDir(status)] : ['drafts', 'published', 'failed'].map(s => ensureDir(s))
  const articles: Article[] = []
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      try {
        const filePath = path.join(dir, file)
        const parsed = matter.read(filePath)
        articles.push({
          ...parsed.data as ArticleMeta,
          content: parsed.content,
        })
      } catch (e) {
        logger.warn(`Failed to parse article file: ${file}`)
      }
    }
  }
  articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return articles
}

export function updateArticleStatus(id: string, status: ArticleStatus, extra?: Partial<ArticleMeta>): Article | null {
  const article = getArticle(id)
  if (!article) return null
  article.status = status
  if (extra) Object.assign(article, extra)
  const oldDir = article.status === 'draft' ? 'drafts' : article.status === 'published' ? 'published' : 'failed'
  const oldPath = path.join(articlesDir, oldDir, `${id}.md`)
  if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  saveArticle(article)
  return article
}

export function createArticle(title: string, content: string, source: Article['source']): Article {
  const article: Article = {
    id: uuidv4(),
    title,
    content,
    source,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
  return article
}

export function deleteArticle(id: string): boolean {
  for (const status of ['drafts', 'published', 'failed'] as const) {
    const filePath = path.join(articlesDir, status, `${id}.md`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      logger.info(`Article deleted: ${id}`)
      return true
    }
  }
  return false
}
