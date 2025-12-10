import { NextRequest, NextResponse } from 'next/server'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

// Vertex AI Text-to-Speech API endpoint
// Uses Google Cloud Text-to-Speech API with OAuth2 authentication

interface TTSRequest {
  text: string
  voiceId: string
  speakingRate?: number
  pitch?: number  // Pitch adjustment in semitones (-20.0 to +20.0, negative = deeper/darker)
}

interface WordTiming {
  word: string
  start: number
  end: number
}

// Initialize TTS client with Service Account credentials
function getTTSClient() {
  // Check if credentials are provided as JSON string (for Vercel/production)
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  
  if (serviceAccountKey) {
    // Parse JSON string from environment variable
    const credentials = JSON.parse(serviceAccountKey)
    return new TextToSpeechClient({ credentials })
  }
  
  // Use GOOGLE_APPLICATION_CREDENTIALS for local development
  // This should point to the JSON file path
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  
  if (credentialsPath) {
    return new TextToSpeechClient({
      keyFilename: credentialsPath
    })
  }
  
  // Try to use default credentials (if running on Google Cloud)
  return new TextToSpeechClient()
}

export async function POST(req: NextRequest) {
  try {
    const body: TTSRequest = await req.json()
    const { text, voiceId, speakingRate = 0.9, pitch = 0 } = body

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: text and voiceId' },
        { status: 400 }
      )
    }

    // Initialize TTS client
    let client: TextToSpeechClient
    try {
      client = getTTSClient()
    } catch (error: any) {
      console.error('Failed to initialize TTS client:', error)
      return NextResponse.json(
        { 
          error: 'Failed to initialize TTS client',
          details: error.message,
          hint: 'Make sure GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY is set correctly'
        },
        { status: 500 }
      )
    }

    // Parse voice ID to get language and name
    // Format: en-US-Journey-D or en-GB-Journey-F
    const [langCode, region, ...nameParts] = voiceId.split('-')
    const languageCode = `${langCode}-${region}`
    const voiceName = voiceId

    // Split text into words for better timing calculation
    const words = text.split(/\s+/).filter(w => w.trim().length > 0)
    
    // Common short names that TTS might spell out as letters (M-I-A instead of Mia)
    // Solution: Add a space before short capitalized names to help TTS interpret them as words
    const shortNames = new Set(['mia', 'ava', 'zoe', 'noa', 'lee', 'kai', 'max', 'sam', 'tom', 'dan', 'bob', 'tim',
      'amy', 'may', 'ann', 'eve', 'lyn', 'joy', 'ray', 'jay', 'rio', 'pia', 'ria', 'tia'])
    
    // Process text to help TTS recognize short names as words
    // Add an extra space before short capitalized names to give TTS context
    let processedText = text
    const namePattern = /\b([A-Z][a-z]{2,3})\b/g
    if (namePattern.test(text)) {
      processedText = text.replace(/\b([A-Z][a-z]{2,3})\b/g, (match, word) => {
        const lowerWord = word.toLowerCase()
        if (shortNames.has(lowerWord)) {
          // Add subtle spacing context - replace with the name preceded by a period space
          // This helps TTS understand it's a word, not an acronym
          return `. ${word}`
        }
        return match
      })
      // Clean up any double spaces that might have been created
      processedText = processedText.replace(/\s+/g, ' ').trim()
    }
    
    // Use plain text input - SSML with breaks can cause INVALID_ARGUMENT errors
    const [response] = await client.synthesizeSpeech({
      input: { text: processedText },
      voice: {
        languageCode: languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: pitch, // Negative values = deeper/darker voice
        volumeGainDb: 0,
      },
    })

    if (!response.audioContent) {
      return NextResponse.json(
        { error: 'No audio content returned from API' },
        { status: 500 }
      )
    }

    // Convert audio content to base64 string
    const audioContent = Buffer.from(response.audioContent as Uint8Array).toString('base64')

    // Calculate accurate word timings based on speaking rate and word characteristics
    // These calculations are based on typical English speech patterns
    let currentTime = 0
    const wordTimings: WordTiming[] = words.map((word) => {
      const cleanWord = word.replace(/[.,!?;:'"]/g, '')
      
      // Base duration calculation:
      // - Very short words (1-2 chars): 150ms base
      // - Medium words (3-5 chars): 200-300ms base  
      // - Long words (6+ chars): 300-400ms base
      // - Punctuation adds pause time
      const wordLength = cleanWord.length
      let baseDuration: number
      
      if (wordLength <= 2) {
        baseDuration = 0.15
      } else if (wordLength <= 5) {
        baseDuration = 0.15 + (wordLength - 2) * 0.03
      } else {
        baseDuration = 0.24 + (wordLength - 5) * 0.025
      }
      
      // Adjust for speaking rate
      const duration = baseDuration / speakingRate
      
      // Check for punctuation that adds pauses
      const hasPause = /[.,!?;:]/.test(word)
      const pauseTime = hasPause ? (0.15 / speakingRate) : 0
      
      const startTime = currentTime
      const endTime = currentTime + duration
      
      currentTime = endTime + pauseTime + (0.08 / speakingRate) // Small pause between words
      
      return {
        word: word,
        start: startTime,
        end: endTime,
      }
    })

    return NextResponse.json({
      audioContent,
      contentType: 'audio/mpeg',
      wordTimings,
    })
  } catch (error: any) {
    console.error('TTS API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        hint: error.message?.includes('Could not load the default credentials') 
          ? 'Check that GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY is set correctly'
          : 'See server logs for more details'
      },
      { status: 500 }
    )
  }
}


