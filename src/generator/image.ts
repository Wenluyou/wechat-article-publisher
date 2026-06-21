import { appConfig } from '../config'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs'

const imagesDir = path.resolve(__dirname, '..', '..', 'public', 'images')

function ensureImagesDir(): string {
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
  }
  return imagesDir
}

export interface GenerateImageParams {
  prompt: string
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1536' | '1536x1024'
  quality?: 'standard' | 'hd'
}

export interface GenerateImageResult {
  success: boolean
  imageUrl?: string
  error?: string
  imagePath?: string
}

export async function generateImage(prompt: string, params?: Partial<GenerateImageParams>): Promise<GenerateImageResult> {
  try {
    const size = params?.size || '1024x1024'
    const quality = params?.quality || 'standard'
    const modelName = appConfig.image.model || 'agnes-image-2.1-flash'

    logger.info(`Generating image with prompt: ${prompt.slice(0, 50)}...`)

    const response = await fetch(`${appConfig.image.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appConfig.image.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        prompt,
        size,
        quality,
        n: 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Image generation API error: ${response.status} ${errorText}`)
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      }
    }

    const data: any = await response.json()

    // Handle different response formats
    let imageUrl: string | undefined
    if (data.data && data.data[0]) {
      imageUrl = data.data[0].url || data.data[0].b64_json
    } else if (data.url) {
      imageUrl = data.url
    }

    if (!imageUrl) {
      logger.warn('Image generation returned no image data')
      return {
        success: false,
        error: 'No image data returned from API',
      }
    }

    // If it's a base64 image, save it locally
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('base64:')) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '')
      const ext = imageUrl.includes('png') ? 'png' : 'jpg'
      const fileName = `img_${Date.now()}.${ext}`
      const filePath = path.join(ensureImagesDir(), fileName)
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      logger.info(`Image saved locally: ${filePath}`)
      return {
        success: true,
        imageUrl: `/images/${fileName}`,
        imagePath: filePath,
      }
    } else if (imageUrl.startsWith('http')) {
      // Download and save URL image locally
      try {
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const fileName = `img_${Date.now()}.jpg`
        const filePath = path.join(ensureImagesDir(), fileName)
        fs.writeFileSync(filePath, Buffer.from(imageBuffer))
        logger.info(`Image downloaded and saved: ${filePath}`)
        return {
          success: true,
          imageUrl: `/images/${fileName}`,
          imagePath: filePath,
        }
      } catch (downloadError) {
        logger.warn('Failed to download image, using URL directly')
        return {
          success: true,
          imageUrl,
        }
      }
    } else {
      // Assume it's a local path or relative path
      return {
        success: true,
        imageUrl: `/images/${imageUrl}`,
      }
    }
  } catch (error) {
    logger.error(`Image generation failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
