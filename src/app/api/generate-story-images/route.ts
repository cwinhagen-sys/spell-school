import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

// API route for generating story images using DALL-E 3

const RequestSchema = z.object({
  storyId: z.string().min(1),
  segmentId: z.string().min(1),
  prompt: z.string().min(1),
  style: z.enum(['comic', 'childrens_book', 'realistic']).default('comic'),
})

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

// Style prefixes for different art styles
const STYLE_PREFIXES = {
  comic: 'Comic book illustration style, vibrant colors, bold outlines, dynamic composition, expressive characters, speech-bubble friendly, clean digital art:',
  childrens_book: 'Children\'s book illustration, warm watercolor style, soft colors, friendly characters, cozy atmosphere, gentle lighting:',
  realistic: 'Photorealistic digital painting, detailed textures, natural lighting, cinematic composition:'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { storyId, segmentId, prompt, style } = RequestSchema.parse(body)

    const client = getOpenAIClient()
    
    // Create enhanced prompt with style
    const stylePrefix = STYLE_PREFIXES[style]
    const enhancedPrompt = `${stylePrefix} ${prompt}. No text or words in the image.`

    console.log(`🎨 Generating image for ${storyId}/${segmentId}...`)

    // Generate image using DALL-E 3
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    })

    const imageData = response.data?.[0]?.b64_json
    if (!imageData) {
      throw new Error('No image data returned from DALL-E')
    }

    // Create directory for story images
    const imagesDir = path.join(process.cwd(), 'public', 'images', 'scenarios', storyId)
    await fs.mkdir(imagesDir, { recursive: true })

    // Save image to file
    const fileName = `${segmentId}.png`
    const filePath = path.join(imagesDir, fileName)
    const buffer = Buffer.from(imageData, 'base64')
    await fs.writeFile(filePath, buffer)

    // Return the public URL path
    const publicPath = `/images/scenarios/${storyId}/${fileName}`

    console.log(`✅ Image saved: ${publicPath}`)

    return NextResponse.json({
      success: true,
      imagePath: publicPath,
      storyId,
      segmentId,
      revisedPrompt: response.data?.[0]?.revised_prompt
    })

  } catch (error: any) {
    console.error('Generate Story Image API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate image', details: error.message },
      { status: 500 }
    )
  }
}

// Batch generate all images for a story
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { storyId, segments } = body

    if (!storyId || !segments || typeof segments !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: storyId and segments required' },
        { status: 400 }
      )
    }

    const client = getOpenAIClient()
    const results: { [segmentId: string]: string } = {}
    const errors: { [segmentId: string]: string } = {}

    // Create directory for story images
    const imagesDir = path.join(process.cwd(), 'public', 'images', 'scenarios', storyId)
    await fs.mkdir(imagesDir, { recursive: true })

    // Generate images for each segment
    for (const [segmentId, segment] of Object.entries(segments as Record<string, any>)) {
      if (!segment.imagePrompt) continue

      try {
        console.log(`🎨 Generating image for ${storyId}/${segmentId}...`)

        const enhancedPrompt = `Comic book illustration style, vibrant colors, bold outlines, dynamic composition, expressive characters, clean digital art: ${segment.imagePrompt}. No text or words in the image.`

        const response = await client.images.generate({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'b64_json'
        })

        const imageData = response.data?.[0]?.b64_json
        if (imageData) {
          const fileName = `${segmentId}.png`
          const filePath = path.join(imagesDir, fileName)
          const buffer = Buffer.from(imageData, 'base64')
          await fs.writeFile(filePath, buffer)
          
          results[segmentId] = `/images/scenarios/${storyId}/${fileName}`
          console.log(`✅ Image saved: ${results[segmentId]}`)
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`❌ Error generating ${segmentId}:`, error.message)
        errors[segmentId] = error.message
      }
    }

    return NextResponse.json({
      success: true,
      storyId,
      generated: Object.keys(results).length,
      failed: Object.keys(errors).length,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Batch Generate Images API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate images', details: error.message },
      { status: 500 }
    )
  }
}




