import { NextRequest, NextResponse } from 'next/server'
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '@/lib/env'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

/**
 * Azure Speech Service Pronunciation Assessment API
 * 
 * This endpoint receives audio data and a reference text (word),
 * sends it to Azure Speech Service for pronunciation assessment,
 * and returns detailed feedback including accuracy, fluency, and completeness scores.
 * 
 * Note: Azure Pronunciation Assessment via REST API requires using the Speech Recognition API
 * with pronunciation assessment parameters. For full pronunciation assessment features,
 * consider using Azure Speech SDK, but this REST API implementation provides basic functionality.
 */

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      console.error('Azure Speech environment variables missing:', {
        hasKey: !!process.env.AZURE_SPEECH_KEY,
        hasRegion: !!process.env.AZURE_SPEECH_REGION,
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
      })
      return NextResponse.json(
        { 
          error: 'Azure Speech API configuration missing',
          details: 'AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set in environment variables'
        },
        { status: 500 }
      )
    }

    // Parse form data (audio file + word)
    let formData: FormData
    let audioFile: File | null
    let word: string | null
    
    try {
      formData = await request.formData()
      audioFile = formData.get('audio') as File
      word = formData.get('word') as string
    } catch (error: any) {
      console.error('❌ Failed to parse form data:', error)
      return NextResponse.json(
        { 
          error: 'Failed to parse request data',
          details: error?.message || 'Invalid form data'
        },
        { status: 400 }
      )
    }

    if (!audioFile) {
      return NextResponse.json(
        { 
          error: 'Audio file is required',
          details: 'No audio file provided in the request'
        },
        { status: 400 }
      )
    }

    if (!word) {
      return NextResponse.json(
        { 
          error: 'Word is required',
          details: 'No word provided in the request'
        },
        { status: 400 }
      )
    }

    const apiKey = AZURE_SPEECH_KEY()
    const region = AZURE_SPEECH_REGION()

    // Convert audio file to ArrayBuffer
    let audioBuffer: ArrayBuffer
    try {
      audioBuffer = await audioFile.arrayBuffer()
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        return NextResponse.json(
          { 
            error: 'Invalid audio file',
            details: 'Audio file is empty or could not be read'
          },
          { status: 400 }
        )
      }
    } catch (error: any) {
      console.error('❌ Failed to read audio file:', error)
      return NextResponse.json(
        { 
          error: 'Failed to read audio file',
          details: error?.message || 'Could not process audio file'
        },
        { status: 400 }
      )
    }

    // Use Azure Speech SDK for pronunciation assessment with phoneme-level analysis
    // This provides actual phonetic analysis, not just transcription matching
    try {
      return new Promise<NextResponse>((resolve, reject) => {
      let transcript = ''
      let accuracyScoreFromAzure: number | null = null
      let pronunciationResult: any = null
      let resolved = false
      let recognizer: sdk.SpeechRecognizer | null = null

      const safeResolve = (response: NextResponse) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          if (recognizer) {
            try {
              recognizer.close()
            } catch (e) {
              // Ignore errors when closing
            }
          }
          resolve(response)
        }
      }

      // Set up timeout to prevent hanging (10 seconds)
      const requestStartTime = Date.now()
      const timeoutId = setTimeout(() => {
        const elapsedTime = Date.now() - requestStartTime
        console.error('⏱️ Pronunciation assessment timeout - Azure SDK did not respond within 10 seconds')
        console.error('⏱️ Timeout details:', {
          resolved,
          elapsedTime: `${elapsedTime}ms`,
          audioBufferSize: audioBuffer?.byteLength,
          hasRecognizer: !!recognizer,
          recognizerState: recognizer?.properties ? 'created' : 'not created'
        })
        
        // Try to cancel the recognition if it's still running
        if (recognizer && !resolved) {
          try {
            console.log('🛑 Attempting to cancel Azure Speech recognition...')
            recognizer.stopContinuousRecognitionAsync(
              () => {
                console.log('✅ Recognition canceled successfully')
              },
              (cancelError: string) => {
                console.error('❌ Error canceling recognition:', cancelError)
              }
            )
          } catch (cancelError: any) {
            console.error('❌ Exception while canceling recognition:', cancelError)
          }
        }
        
        if (!resolved) {
          safeResolve(
            NextResponse.json(
              { 
                error: 'Pronunciation assessment timeout',
                details: `The assessment took too long (${elapsedTime}ms). Azure Speech Service may be unresponsive or subscription may have issues.`,
                isCorrect: false,
                accuracyScore: 0,
                feedback: 'Analysen tog för lång tid. Detta kan bero på att Azure Speech Service inte svarar. Kontrollera din subscription och försök igen.',
                transcript: ''
              },
              { status: 504 }
            )
          )
        }
      }, 10000) // 10 second timeout

      // Validate Azure credentials before creating config
      console.log('🔑 Validating Azure credentials...', {
        hasKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        keyPrefix: apiKey?.substring(0, 8) || 'N/A',
        region: region || 'N/A'
      })

      if (!apiKey || apiKey.length < 10) {
        console.error('❌ Invalid Azure Speech API key')
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Invalid Azure Speech API key',
            details: 'The API key appears to be invalid or too short',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Azure Speech Service är inte korrekt konfigurerad. Kontakta support.',
            transcript: ''
          },
          { status: 500 }
        )
      }

      if (!region || region.length < 3) {
        console.error('❌ Invalid Azure Speech region')
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Invalid Azure Speech region',
            details: 'The region appears to be invalid',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Azure Speech Service region är inte korrekt konfigurerad. Kontakta support.',
            transcript: ''
          },
          { status: 500 }
        )
      }

      let speechConfig: sdk.SpeechConfig
      try {
        speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region)
        speechConfig.speechRecognitionLanguage = 'en-US'
        console.log('✅ Azure Speech config created successfully')
      } catch (configError: any) {
        console.error('❌ Error creating Azure Speech config:', configError)
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Failed to create Azure Speech configuration',
            details: configError?.message || 'Could not initialize Azure Speech SDK with provided credentials',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Kunde inte ansluta till Azure Speech Service. Kontrollera din subscription och försök igen.',
            transcript: ''
          },
          { status: 500 }
        )
      }

      // Create pronunciation assessment config with phoneme-level granularity
      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        word,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true // Enable miscue detection
      )

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        console.error('❌ Invalid audio buffer: empty or null')
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Invalid audio data',
            details: 'Audio buffer is empty or invalid',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Ljudfilen är ogiltig. Försök spela in igen.',
            transcript: ''
          },
          { status: 400 }
        )
      }

      console.log('🎤 Audio buffer info:', {
        size: audioBuffer.byteLength,
        sizeKB: Math.round(audioBuffer.byteLength / 1024)
      })

      // Create push audio input stream
      const pushStream = sdk.AudioInputStream.createPushStream()
      
      try {
        // Convert ArrayBuffer to Buffer for Node.js, then to ArrayBuffer for Azure SDK
        const buffer = Buffer.from(audioBuffer)
        // Azure SDK accepts Buffer, but TypeScript types expect ArrayBuffer
        // Convert Buffer back to ArrayBuffer for type safety
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        
        console.log('🎤 Writing audio to stream:', {
          bufferSize: buffer.length,
          arrayBufferSize: arrayBuffer.byteLength,
          audioBufferSize: audioBuffer.byteLength
        })
        
        // Write audio data to stream
        pushStream.write(arrayBuffer)
        pushStream.close()
        
        console.log('✅ Audio data written to stream successfully')
      } catch (streamError: any) {
        console.error('❌ Error writing to audio stream:', streamError)
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Failed to process audio stream',
            details: streamError?.message || 'Could not write audio data to stream',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Kunde inte bearbeta ljudfilen. Försök igen.',
            transcript: ''
          },
          { status: 500 }
        )
      }

      // Create audio config from stream
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

      // Create speech recognizer
      try {
        recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
        pronunciationConfig.applyTo(recognizer)
        console.log('✅ Speech recognizer created successfully')
        
        // Add event listeners to track recognizer state
        recognizer.sessionStarted = (s: any, e: sdk.SessionEventArgs) => {
          console.log('🎤 Azure Speech session started')
        }
        
        recognizer.sessionStopped = (s: any, e: sdk.SessionEventArgs) => {
          console.log('🎤 Azure Speech session stopped')
        }
        
        recognizer.canceled = (s: any, e: sdk.SpeechRecognitionCanceledEventArgs) => {
          console.error('❌ Azure Speech recognition canceled:', {
            reason: e.reason,
            errorCode: e.errorCode,
            errorDetails: e.errorDetails
          })
          
          // If recognition was canceled, resolve with error
          if (!resolved) {
            let userMessage = 'Uttalsanalys avbröts. Försök igen.'
            if (e.reason === sdk.CancellationReason.Error) {
              userMessage = 'Ett fel uppstod vid uttalsanalys. Kontrollera din Azure subscription och försök igen.'
            } else if (e.reason === sdk.CancellationReason.EndOfStream) {
              userMessage = 'Ljudströmmen avslutades för tidigt. Försök spela in igen.'
            }
            
            safeResolve(
              NextResponse.json(
                { 
                  error: 'Speech recognition canceled',
                  details: e.errorDetails || `Reason: ${e.reason}`,
                  isCorrect: false,
                  accuracyScore: 0,
                  feedback: userMessage,
                  transcript: ''
                },
                { status: 500 }
              )
            )
          }
        }
      } catch (recognizerError: any) {
        console.error('❌ Error creating speech recognizer:', recognizerError)
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Failed to create speech recognizer',
            details: recognizerError?.message || 'Could not initialize Azure Speech SDK',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Kunde inte initiera uttalsanalys. Försök igen.',
            transcript: ''
          },
          { status: 500 }
        )
      }

      console.log('🎤 Starting Azure Speech recognition...')
      const recognitionStartTime = Date.now()
      
      try {
        recognizer.recognizeOnceAsync(
          (result: sdk.SpeechRecognitionResult) => {
            const recognitionTime = Date.now() - recognitionStartTime
            console.log('🎤 Azure Speech recognition callback received:', {
              reason: result.reason,
              text: result.text,
              reasonText: sdk.ResultReason[result.reason],
              duration: `${recognitionTime}ms`
            })
            
            recognizer.close()

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              transcript = result.text.toLowerCase().trim()

              // Get pronunciation assessment result
              const pronunciationAssessmentResult = 
                sdk.PronunciationAssessmentResult.fromResult(result)
              
              if (pronunciationAssessmentResult) {
                accuracyScoreFromAzure = pronunciationAssessmentResult.accuracyScore
                pronunciationResult = {
                  accuracyScore: pronunciationAssessmentResult.accuracyScore,
                  pronunciationScore: pronunciationAssessmentResult.pronunciationScore,
                  completenessScore: pronunciationAssessmentResult.completenessScore,
                  fluencyScore: pronunciationAssessmentResult.fluencyScore
                }

                console.log('🎯 Azure Pronunciation Assessment Result:', {
                  transcript,
                  accuracyScore: accuracyScoreFromAzure,
                  pronunciationScore: pronunciationAssessmentResult.pronunciationScore,
                  completenessScore: pronunciationAssessmentResult.completenessScore,
                  fluencyScore: pronunciationAssessmentResult.fluencyScore
                })
              } else {
                console.warn('⚠️ Pronunciation assessment result not available')
              }
            } else {
              console.warn('⚠️ Azure recognition failed:', {
                reason: result.reason,
                reasonText: sdk.ResultReason[result.reason],
                text: result.text
              })
            }

            // Continue with processing...
            processPronunciationResult(
              transcript,
              word,
              accuracyScoreFromAzure,
              pronunciationResult,
              safeResolve
            )
          },
          (error: string) => {
            console.error('❌ Azure Speech SDK error callback:', error)
            
            // Check for common Azure subscription errors
            let userFriendlyMessage = 'Kunde inte analysera uttal. Försök igen.'
            if (error?.includes('401') || error?.includes('Unauthorized') || error?.includes('authentication')) {
              userFriendlyMessage = 'Azure Speech Service-autentisering misslyckades. Kontrollera att din API-nyckel är korrekt och att din subscription är aktiv.'
              console.error('🔑 Azure authentication error - check API key and subscription')
            } else if (error?.includes('403') || error?.includes('Forbidden')) {
              userFriendlyMessage = 'Azure Speech Service nekade åtkomst. Kontrollera att din subscription har rätt behörigheter.'
              console.error('🚫 Azure access denied - check subscription permissions')
            } else if (error?.includes('429') || error?.includes('rate limit') || error?.includes('quota')) {
              userFriendlyMessage = 'Azure Speech Service har nått sin gräns. Försök igen om en stund.'
              console.error('⏱️ Azure rate limit exceeded')
            } else if (error?.includes('404') || error?.includes('Not Found')) {
              userFriendlyMessage = 'Azure Speech Service hittades inte. Kontrollera att din region är korrekt.'
              console.error('🌍 Azure region error - check region setting')
            }
            
            recognizer.close()
            safeResolve(
              NextResponse.json(
                { 
                  error: 'Failed to assess pronunciation', 
                  details: error,
                  isCorrect: false,
                  accuracyScore: 0,
                  feedback: userFriendlyMessage,
                  transcript: ''
                },
                { status: 500 }
              )
            )
          }
        )
      } catch (asyncError: any) {
        console.error('❌ Error calling recognizeOnceAsync:', asyncError)
        recognizer.close()
        clearTimeout(timeoutId)
        return NextResponse.json(
          { 
            error: 'Failed to start speech recognition',
            details: asyncError?.message || 'Could not call Azure Speech SDK',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Kunde inte starta uttalsanalys. Försök igen.',
            transcript: ''
          },
          { status: 500 }
        )
      }
      }).catch((promiseError: any) => {
        console.error('❌ Promise error in pronunciation assessment:', {
          message: promiseError?.message,
          stack: promiseError?.stack,
          name: promiseError?.name,
          error: promiseError
        })
        return NextResponse.json(
          { 
            error: 'Failed to assess pronunciation', 
            details: promiseError?.message || 'Promise rejected',
            isCorrect: false,
            accuracyScore: 0,
            feedback: 'Ett fel uppstod vid uttalsanalys. Försök igen.',
            transcript: ''
          },
          { status: 500 }
        )
      })
    } catch (promiseCreationError: any) {
      console.error('❌ Error creating Promise for pronunciation assessment:', {
        message: promiseCreationError?.message,
        stack: promiseCreationError?.stack,
        name: promiseCreationError?.name,
        error: promiseCreationError
      })
      return NextResponse.json(
        { 
          error: 'Failed to initialize pronunciation assessment', 
          details: promiseCreationError?.message || 'Could not create assessment promise',
          isCorrect: false,
          accuracyScore: 0,
          feedback: 'Kunde inte initiera uttalsanalys. Försök igen.',
          transcript: ''
        },
        { status: 500 }
      )
    }

    // Helper function to process pronunciation result
    function processPronunciationResult(
      transcript: string,
      word: string,
      accuracyScoreFromAzure: number | null,
      pronunciationResult: any,
      resolve: (response: NextResponse) => void
    ) {
    
    // Normalize transcript: remove punctuation and extra whitespace
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }
    
    const normalizedTranscript = normalizeText(transcript)
    const expectedWordLower = normalizeText(word)
    
    console.log('🔍 Comparing:', {
      originalTranscript: transcript,
      normalizedTranscript,
      expectedWord: word,
      normalizedExpected: expectedWordLower
    })
    
    // For multi-word phrases, compare each word individually for stricter assessment
    const wordsMatch = (transcriptWords: string[], expectedWords: string[]): { match: boolean, accuracy: number } => {
      if (transcriptWords.length !== expectedWords.length) {
        // Different number of words - significant error
        return { match: false, accuracy: 0 }
      }
      
      let totalAccuracy = 0
      let allMatch = true
      
      for (let i = 0; i < expectedWords.length; i++) {
        const transcriptWord = transcriptWords[i] || ''
        const expectedWord = expectedWords[i] || ''
        
        if (transcriptWord === expectedWord) {
          totalAccuracy += 100
        } else {
          allMatch = false
          // For word-level comparison, be stricter - require very high similarity
          const similarity = calculateStrictSimilarity(transcriptWord, expectedWord)
          totalAccuracy += similarity * 100
        }
      }
      
      return {
        match: allMatch,
        accuracy: totalAccuracy / expectedWords.length
      }
    }
    
    // Split into words for comparison
    const transcriptWords = normalizedTranscript.split(/\s+/).filter(w => w.length > 0)
    const expectedWords = expectedWordLower.split(/\s+/).filter(w => w.length > 0)
    
    let isCorrect = false
    let accuracyScore = 0
    let confidence = 0
    
    // If Azure provided pronunciation assessment score, use it (more accurate for phonetic analysis)
    if (accuracyScoreFromAzure !== null && accuracyScoreFromAzure !== undefined) {
      // Azure's pronunciation assessment score (0-100)
      // This score is based on phoneme-level analysis, so it catches phonetic errors
      let baseAccuracyScore = Math.round(accuracyScoreFromAzure)
      confidence = pronunciationResult?.pronunciationScore || 0.5
      
      // Apply completeness penalty for incomplete pronunciations
      // If completeness is low (e.g., saying "Chris" instead of "Christmas"), 
      // significantly reduce the accuracy score
      const completenessScore = pronunciationResult?.completenessScore
      if (completenessScore !== null && completenessScore !== undefined) {
        // If completeness is below 85%, apply a penalty
        // This catches cases where only part of the word is pronounced
        if (completenessScore < 85) {
          // Apply penalty: reduce accuracy by the completeness gap
          // Example: 80% accuracy with 60% completeness = 80 * 0.6 = 48% final score
          const completenessFactor = completenessScore / 100
          baseAccuracyScore = Math.round(baseAccuracyScore * completenessFactor)
          
          console.log('⚠️ Completeness penalty applied:', {
            originalAccuracy: accuracyScoreFromAzure,
            completenessScore,
            adjustedAccuracy: baseAccuracyScore
          })
        }
      }
      
      accuracyScore = baseAccuracyScore
      
      // Use Azure's accuracy score with thresholds
      // Azure's pronunciation assessment analyzes phonemes, so it catches phonetic errors like "lux" vs "luxury"
      // But we want to be encouraging, so we accept 85%+ as correct
      if (accuracyScore >= 85) {
        isCorrect = true
      } else {
        isCorrect = false
      }
      
      console.log('🎯 Using Azure Pronunciation Assessment score:', {
        original: accuracyScoreFromAzure,
        completeness: completenessScore,
        final: accuracyScore
      })
    } else {
      // Fallback to text-based comparison if pronunciation assessment not available
      if (expectedWords.length > 1) {
        // Multi-word phrase - compare word by word
        const wordComparison = wordsMatch(transcriptWords, expectedWords)
        isCorrect = wordComparison.match
        accuracyScore = Math.round(wordComparison.accuracy)
        confidence = 0.5
        
        // For multi-word, be even stricter - require 98%+ for perfect
        if (accuracyScore >= 98 && wordComparison.match) {
          isCorrect = true
        } else {
          isCorrect = false
        }
      } else {
        // Single word - use strict comparison
        const singleWord = expectedWords[0] || expectedWordLower
        const singleTranscript = transcriptWords[0] || normalizedTranscript
        
        if (singleTranscript === singleWord) {
          isCorrect = true
          accuracyScore = 100
          confidence = 0.9
        } else {
          // Use strict similarity calculation
          const similarity = calculateStrictSimilarity(singleTranscript, singleWord)
          accuracyScore = Math.round(similarity * 100)
          confidence = 0.5
          isCorrect = false
          
          // For single words, require 95%+ for perfect (stricter than before)
          if (accuracyScore >= 95) {
            // Still not perfect, but close
          }
        }
      }
      
      console.log('⚠️ Azure Pronunciation Assessment not available, using text-based comparison')
    }

    // Generate simple feedback based on result (with more lenient thresholds)
    let feedback = ''
    if (!transcript) {
      // No transcript received - likely audio format issue or no speech detected
      feedback = 'Listen to the word and try again'
      accuracyScore = 0
      isCorrect = false
    } else if (isCorrect && accuracyScore >= 85) {
      // Good pronunciation (85%+)
      feedback = 'Perfect pronunciation'
      // Keep the actual score, but mark as correct
      if (accuracyScore >= 95) {
        accuracyScore = 100 // Perfect score for very high accuracy
      }
    } else if (accuracyScore >= 70) {
      // Close but not quite there (70-84%)
      feedback = 'Close, try again'
      isCorrect = false
    } else {
      // Needs improvement (below 70%)
      feedback = 'Listen to the word and try again'
      isCorrect = false
    }

      // Log detailed comparison for debugging
      console.log('📊 Pronunciation Assessment Result:', {
        transcript: normalizedTranscript,
        expected: expectedWordLower,
        isCorrect,
        accuracyScore,
        transcriptWords: transcriptWords.length,
        expectedWords: expectedWords.length
      })
      
      resolve(NextResponse.json({
        success: true,
        transcript: normalizedTranscript || transcript || 'Ingen tydlig transkription',
        expectedWord: word,
        isCorrect,
        accuracyScore,
        confidence: Math.round(confidence * 100),
        fluencyScore: pronunciationResult?.fluencyScore || (isCorrect ? 100 : Math.max(50, accuracyScore - 10)),
        completenessScore: pronunciationResult?.completenessScore || (isCorrect ? 100 : Math.max(50, accuracyScore - 20)),
        feedback
      }))
    }
  } catch (error: any) {
    console.error('❌ Pronunciation assessment error (outer catch):', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error
    })
    return NextResponse.json(
      { 
        error: 'Failed to assess pronunciation', 
        details: error?.message || 'Unknown error occurred',
        errorType: error?.name || 'Unknown',
        isCorrect: false,
        accuracyScore: 0,
        feedback: 'Ett fel uppstod vid uttalsanalys. Försök igen.',
        transcript: ''
      },
      { status: 500 }
    )
  }
}

// Strict similarity calculation - penalizes differences more heavily
function calculateStrictSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 0.0 // Empty strings don't match
  
  const editDistance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  
  // Stricter calculation: penalize differences more
  // For short words (<= 4 chars), be very strict
  if (maxLength <= 4) {
    if (editDistance === 0) return 1.0
    if (editDistance === 1) return 0.7 // One character difference = 70%
    if (editDistance === 2) return 0.3 // Two character differences = 30%
    return 0.0 // More than 2 differences = 0%
  }
  
  // For longer words, use standard calculation but be stricter
  const similarity = (maxLength - editDistance) / maxLength
  
  // Penalize more: if similarity is below 0.9, reduce it further
  if (similarity < 0.9) {
    return similarity * 0.8 // Reduce by 20% for non-exact matches
  }
  
  return similarity
}

// Original similarity calculation (kept for backward compatibility)
function calculateSimilarity(str1: string, str2: string): number {
  return calculateStrictSimilarity(str1, str2)
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

