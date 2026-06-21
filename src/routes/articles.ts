import { Router } from 'express'
import { listArticles, getArticle, deleteArticle, saveArticle, createArticle } from '../storage'
import { generateByTopic, generateByOutline } from '../generator/ai'
import { generateImage } from '../generator/image'
import { publishArticle } from '../publisher'

const router = Router()

router.get('/', (req, res) => {
  const status = req.query.status as string | undefined
  const articles = listArticles(status as any)
  res.render('articles', { articles, filter: status || 'all' })
})

router.get('/:id', (req, res) => {
  const article = getArticle(req.params.id)
  if (!article) return res.status(404).send('Article not found')
  res.render('article-view', { article })
})

router.post('/generate', async (req, res) => {
  const { topic, outline } = req.body
  let article
  if (outline) {
    article = await generateByOutline(outline)
  } else if (topic) {
    article = await generateByTopic(topic)
  }
  if (!article) {
    return res.status(500).send({ error: 'Generation failed' })
  }
  saveArticle(article)
  res.redirect(`/articles/${article.id}`)
})

router.post('/:id/publish', async (req, res) => {
  const ok = await publishArticle(req.params.id)
  res.redirect(`/articles/${req.params.id}`)
})

router.post('/:id/delete', (req, res) => {
  deleteArticle(req.params.id)
  res.redirect('/articles')
})

router.post('/manual', (req, res) => {
  const { title, content } = req.body
  if (!title || !content) return res.status(400).send('Title and content required')
  const article = createArticle(title, content, 'manual')
  saveArticle(article)
  res.redirect(`/articles/${article.id}`)
})

router.post('/image/generate', async (req, res) => {
  const { prompt, articleId, size, quality } = req.body
  if (!prompt) return res.status(400).json({ error: 'Prompt required' })
  
  const result = await generateImage(prompt, { size, quality })
  if (!result.success) {
    return res.status(500).json({ error: result.error })
  }
  
  // If we have an article ID, save the image URL to the article
  if (articleId) {
    const article = getArticle(articleId)
    if (article) {
      article.summary = article.summary || ''
      if (result.imageUrl) {
        article.summary = `<img src="${result.imageUrl}" alt="Generated image" />${article.summary || ''}`
      }
      saveArticle(article)
    }
  }
  
  res.json(result)
})

export default router
