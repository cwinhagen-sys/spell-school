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
    // Parse form data (audio file + word)
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const word = formData.get('word') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    const apiKey = AZURE_SPEECH_KEY()
    const region = AZURE_SPEECH_REGION()

    // Convert audio file to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()

    // Use Azure Speech SDK for pronunciation assessment with phoneme-level analysis
    // This provides actual phonetic analysis, not just transcription matching
    return new Promise<NextResponse>((resolve) => {
      const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region)
      speechConfig.speechRecognitionLanguage = 'en-US'

      // Create pronunciation assessment config with phoneme-level granularity
      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        word,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true // Enable miscue detection
      )

      // Create push audio input stream
      const pushStream = sdk.AudioInputStream.createPushStream()
      
      // Convert ArrayBuffer to Buffer for Node.js
      const buffer = Buffer.from(audioBuffer)
      pushStream.write(buffer)
      pushStream.close()

      // Create audio config from stream
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

      // Create speech recognizer
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
      pronunciationConfig.applyTo(recognizer)

      let transcript = ''
      let accuracyScoreFromAzure: number | null = null
      let pronunciationResult: any = null

      recognizer.recognizeOnceAsync(
        (result: sdk.SpeechRecognitionResult) => {
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
            console.warn('Azure recognition failed:', result.reason)
          }

          // Continue with processing...
          processPronunciationResult(
            transcript,
            word,
            accuracyScoreFromAzure,
            pronunciationResult,
            resolve
          )
        },
        (error: string) => {
          recognizer.close()
          console.error('❌ Azure Speech SDK error:', error)
          resolve(
            NextResponse.json(
              { error: 'Failed to assess pronunciation', details: error },
              { status: 500 }
            )
          )
        }
      )
    })

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
      accuracyScore = Math.round(accuracyScoreFromAzure)
      confidence = pronunciationResult?.pronunciationScore || 0.5
      
      // Use Azure's accuracy score with more lenient thresholds
      // Azure's pronunciation assessment analyzes phonemes, so it catches phonetic errors like "lux" vs "luxury"
      // But we want to be encouraging, so we accept 85%+ as correct
      if (accuracyScore >= 85) {
        isCorrect = true
      } else {
        isCorrect = false
      }
      
      console.log('🎯 Using Azure Pronunciation Assessment score:', accuracyScore)
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
    console.error('Pronunciation assessment error:', error)
    return NextResponse.json(
      { error: 'Failed to assess pronunciation', details: error.message },
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

