'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, ArrowLeft, Star, BookOpen, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
import axios from 'axios'
import { getOpenAI } from '@/lib/openai'
import { startGameSession, endGameSession, logWordAttempt, type TrackingContext, updateStudentProgress, previewDiminishedPoints, getDiminishingMeta } from '@/lib/tracking'

interface SentenceMakerProps {
  words: string[]
  onClose: () => void
  onScoreUpdate: (score: number) => void
  trackingContext?: TrackingContext
}

interface Sentence {
  swedishWord: string
  englishWord: string
  partialSentence: string
  completedSentence: string
  hint: string
}

// New interface for dictionary API response
interface DictionaryResponse {
  word: string
  phonetic?: string
  meanings: {
    partOfSpeech: string
    definitions: {
      definition: string
      example?: string
    }[]
  }[]
}

export default function SentenceMaker({ words, onClose, onScoreUpdate, trackingContext }: SentenceMakerProps) {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [story, setStory] = useState<string[]>([])
  const [sentenceTemplates, setSentenceTemplates] = useState<Sentence[]>([])
  const [showHint, setShowHint] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [awardedPoints, setAwardedPoints] = useState(0)
  const [diminishInfo, setDiminishInfo] = useState<{ prior: number; factor: number }>({ prior: 0, factor: 1 })

  // start tracking session on mount (inside component)
  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('story', trackingContext)
      setSessionId(session?.id ?? null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize OpenAI client
  const openai = getOpenAI()

  // Check if OpenAI API key is available
  const isOpenAIAvailable = process.env.NEXT_PUBLIC_OPENAI_API_KEY && process.env.NEXT_PUBLIC_OPENAI_API_KEY.length > 0

  // Smart word analysis using Merriam-Webster API via our proxy
  const analyzeWordWithAPI = async (word: string) => {
    try {
      console.log(`Analyzing word: ${word}`)
      const response = await axios.get(`/api/dictionary?word=${word.toLowerCase()}`)
      const data = response.data
      
      console.log(`API response for ${word}:`, data)
      
      if (data && data.length > 0 && typeof data[0] === 'object') {
        const wordData = data[0]
        const result = {
          word: wordData.meta?.id?.split(':')[0] || word,
          partOfSpeech: wordData.fl || 'noun',
          definition: wordData.shortdef?.[0] || '',
          example: wordData.def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt?.[0]?.[1] || ''
        }
        console.log(`Word analysis result:`, result)
        return result
      }
    } catch (error) {
      console.error(`Could not fetch data for word: ${word}`, error)
    }
    
    // Fallback to basic analysis
    return {
      word: word,
      partOfSpeech: 'noun',
      definition: '',
      example: ''
    }
  }

  // Generate smart sentences using LLM
  const generateSmartSentenceWithLLM = async (wordData: any, index: number): Promise<{ partialSentence: string, hint: string }> => {
    const { word, partOfSpeech, definition } = wordData
    
    // Check if OpenAI is available
    if (!isOpenAIAvailable) {
      console.log('OpenAI not available, using fallback sentences')
      return generateBasicSentence(wordData, index)
    }
    
    try {
      // Create varied prompts for more unique sentences
      const promptVariations = [
        `Create a unique, engaging English sentence for grade 5-6 students using the word "${word}" (${partOfSpeech}). Make it specific and interesting, not generic. The word "${word}" should fit naturally and uniquely in the sentence. Use "..." instead of the word. Make it different from typical sentences.`,
        
        `Write a creative English sentence for students using "${word}" (${partOfSpeech}). Think outside the box - make it memorable and specific. The sentence should only make sense with "${word}" in the blank. Use "..." for the missing word.`,
        
        `Generate an imaginative English sentence with "${word}" (${partOfSpeech}) for young learners. Make it engaging and unique - avoid common patterns. The word "${word}" should be the only logical choice for the blank "...".`,
        
        `Create a distinctive English sentence using "${word}" (${partOfSpeech}) for grade 5-6 students. Be creative and specific - make it different from standard examples. Use "..." where "${word}" should go.`,
        
        `Write an original English sentence featuring "${word}" (${partOfSpeech}) for students. Make it creative and contextually specific. The blank "..." should only logically fit "${word}".`
      ]
      
      // Randomly select a prompt variation
      const randomPrompt = promptVariations[Math.floor(Math.random() * promptVariations.length)]
      
      console.log(`Generating LLM sentence for ${word} with prompt:`, randomPrompt)
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: randomPrompt }],
        max_tokens: 150,
        temperature: 0.9, // Higher temperature for more variety
        presence_penalty: 0.6, // Encourage different content
        frequency_penalty: 0.8 // Discourage repetition
      })

      const generatedSentence = completion.choices[0]?.message?.content?.trim() || ''
      console.log(`LLM generated sentence:`, generatedSentence)
      
      // Clean up the sentence and ensure it has "..."
      let partialSentence = generatedSentence
      if (!partialSentence.includes('...')) {
        // If LLM didn't add "...", add it manually
        partialSentence = partialSentence.replace(word, '...')
      }
      
      // Generate smart hint based on API data
      const hint = generateSmartHint(wordData)
      
      return { partialSentence, hint }
      
    } catch (error) {
      console.error('LLM error:', error)
      // Fallback to basic sentence generation
      return generateBasicSentence(wordData, index)
    }
  }

  // Fallback basic sentence generation
  const generateBasicSentence = (wordData: any, index: number): { partialSentence: string, hint: string } => {
    const { word, partOfSpeech, definition } = wordData
    
    // More varied sentence templates based on part of speech
    const sentenceTemplates = {
      noun: [
        `I discovered a mysterious ${word} in the old attic`,
        `The ancient ${word} held secrets from the past`,
        `My grandmother told stories about the magical ${word}`,
        `The curious ${word} appeared in my dreams`,
        `I found a beautiful ${word} by the river`,
        `The legendary ${word} was mentioned in the book`,
        `My friend showed me an amazing ${word}`,
        `The rare ${word} grew in the hidden garden`,
        `I learned about the special ${word} in science class`,
        `The famous ${word} was displayed in the museum`
      ],
      verb: [
        `I love to ${word} when I'm feeling creative`,
        `My teacher taught me how to ${word} properly`,
        `It's exciting to ${word} with my best friends`,
        `I practice ${word} every day after school`,
        `My parents showed me how to ${word} safely`,
        `I want to ${word} like a professional someday`,
        `It's fun to ${word} in different places`,
        `I learned to ${word} from watching videos`,
        `My sister helps me ${word} better`,
        `I enjoy ${word} during my free time`
      ],
      adjective: [
        `The sunset looked incredibly ${word} tonight`,
        `My new friend is very ${word} and kind`,
        `The movie had a ${word} and surprising ending`,
        `The weather feels ${word} and refreshing today`,
        `This cake tastes ${word} and delicious`,
        `The painting was ${word} and beautiful`,
        `My room looks ${word} and cozy now`,
        `The music sounded ${word} and peaceful`,
        `The flowers smelled ${word} and fresh`,
        `The story was ${word} and exciting`
      ],
      adverb: [
        `I walk ${word} to school every morning`,
        `She sings ${word} in the school choir`,
        `He works ${word} on his homework`,
        `I study ${word} for my important tests`,
        `They play ${word} in the soccer game`,
        `I read ${word} before going to bed`,
        `My dog runs ${word} in the park`,
        `I write ${word} in my journal`,
        `The children laugh ${word} during recess`,
        `I listen ${word} to my favorite music`
      ]
    }

    // Get templates for the part of speech
    const templates = sentenceTemplates[partOfSpeech as keyof typeof sentenceTemplates] || sentenceTemplates.noun
    
    // Use index to select different templates and add some randomness
    const templateIndex = (index + Math.floor(Math.random() * 3)) % templates.length
    
    // Create partial sentence by replacing the word with "..."
    const partialSentence = templates[templateIndex].replace(word, '...')
    
    // Generate smart hint based on part of speech and definition
    const hint = generateSmartHint(wordData)
    
    return { partialSentence, hint }
  }

  // Generate smart hints based on API data
  const generateSmartHint = (wordData: any): string => {
    const { partOfSpeech, definition } = wordData
    
    if (definition) {
      // Simplify the definition for ESL students
      const simpleDefinition = definition
        .replace(/^to\s/, '') // Remove "to" from verb definitions
        .replace(/^a\s/, '') // Remove "a" from noun definitions
        .replace(/^an\s/, '') // Remove "an" from noun definitions
        .replace(/^the\s/, '') // Remove "the" from noun definitions
        .split('.')[0] // Take only first sentence
        .split(',')[0] // Take only first part if comma-separated
      
      return `Hint: ${simpleDefinition}`
    }
    
    // Simple fallback hints for ESL students
    const simpleHints = {
      noun: 'This is a thing, person, place, or idea',
      verb: 'This is an action - something you can do',
      adjective: 'This describes how something is or looks',
      adverb: 'This tells how something is done'
    }
    
    return simpleHints[partOfSpeech as keyof typeof simpleHints] || simpleHints.noun
  }

  // Generate sentences dynamically based on homework words
  useEffect(() => {
    const generateSentences = async () => {
      if (words.length > 0) {
        setIsLoading(true)
        
        try {
          // Shuffle the words to make the game more challenging
          const shuffledWords = [...words].sort(() => Math.random() - 0.5)
          
          // Analyze each word with the API
          const templates: Sentence[] = []
          
          for (let i = 0; i < shuffledWords.length; i++) {
            const word = shuffledWords[i]
            const swedishWord = word.toLowerCase()
            const englishWord = getEnglishTranslation(swedishWord)
            
            // Get word analysis from API
            const wordAnalysis = await analyzeWordWithAPI(englishWord)
            
            // Generate smart sentence using LLM
            const { partialSentence, hint } = await generateSmartSentenceWithLLM(wordAnalysis, i)
            const completedSentence = partialSentence.replace('...', englishWord)
            
            templates.push({
              swedishWord,
              englishWord,
              partialSentence,
              completedSentence,
              hint
            })
          }
          
          setSentenceTemplates(templates)
        } catch (error) {
          console.error('Error generating sentences:', error)
          // Fallback to basic sentences if API fails
          const shuffledWords = [...words].sort(() => Math.random() - 0.5)
          const fallbackTemplates: Sentence[] = shuffledWords.map((word: string, index: number) => {
            const swedishWord = word.toLowerCase()
            const englishWord = getEnglishTranslation(swedishWord)
            const partialSentence = `I learned about the ${englishWord} today`
            const completedSentence = partialSentence
            const hint = 'Think about what this word means'
            
            return {
              swedishWord,
              englishWord,
              partialSentence,
              completedSentence,
              hint
            }
          })
          setSentenceTemplates(fallbackTemplates)
        } finally {
          setIsLoading(false)
        }
      }
    }

    generateSentences()
  }, [words])

  // Track which words have been completed correctly
  const getCompletedWords = () => {
    if (!sentenceTemplates.length) return []
    
    const completed: string[] = []
    for (let i = 0; i < currentSentenceIndex; i++) {
      if (sentenceTemplates[i]) {
        completed.push(sentenceTemplates[i].swedishWord)
      }
    }
    return completed
  }

  // Get English translation for Swedish word
  const getEnglishTranslation = (swedishWord: string): string => {
    const translations: { [key: string]: string } = {
      // Animals
      'hund': 'dog',
      'katt': 'cat',
      'fågel': 'bird',
      'fisk': 'fish',
      'häst': 'horse',
      'ko': 'cow',
      'får': 'sheep',
      'gris': 'pig',
      'kanin': 'rabbit',
      'hamster': 'hamster',
      
      // Buildings and places
      'hus': 'house',
      'skola': 'school',
      'rum': 'room',
      'bibliotek': 'library',
      'affär': 'shop',
      'sjukhus': 'hospital',
      'park': 'park',
      'skog': 'forest',
      'strand': 'beach',
      'berg': 'mountain',
      
      // Transportation
      'bil': 'car',
      'cykel': 'bicycle',
      'buss': 'bus',
      'tåg': 'train',
      'båt': 'boat',
      'flygplan': 'airplane',
      'motorcykel': 'motorcycle',
      'skateboard': 'skateboard',
      
      // Objects and items
      'bok': 'book',
      'penna': 'pencil',
      'papper': 'paper',
      'nyckel': 'key',
      'klocka': 'clock',
      'telefon': 'phone',
      'dator': 'computer',
      'karta': 'map',
      'väskan': 'bag',
      'ryggsäck': 'backpack',
      
      // Food and drinks
      'äpple': 'apple',
      'banan': 'banana',
      'vatten': 'water',
      'mjölk': 'milk',
      'bröd': 'bread',
      'ost': 'cheese',
      'kött': 'meat',
      'grönsaker': 'vegetables',
      'frukt': 'fruit',
      'saft': 'juice',
      
      // Nature
      'träd': 'tree',
      'sol': 'sun',
      'måne': 'moon',
      'stjärna': 'star',
      'blomma': 'flower',
      'gras': 'grass',
      'sten': 'stone',
      'sand': 'sand',
      'snö': 'snow',
      'regn': 'rain',
      
      // Furniture
      'bord': 'table',
      'stol': 'chair',
      'säng': 'bed',
      'lampa': 'lamp',
      'soffa': 'sofa',
      'garderob': 'wardrobe',
      'hylla': 'shelf',
      'spegel': 'mirror',
      
      // Technology
      'tv': 'television',
      'radio': 'radio',
      'kamera': 'camera',
      'hörlurar': 'headphones',
      'laddare': 'charger',
      
      // Clothing
      'kläder': 'clothes',
      'skor': 'shoes',
      'hatt': 'hat',
      'jacka': 'jacket',
      'byxor': 'pants',
      'tröja': 'sweater',
      'strumpor': 'socks',
      'handskar': 'gloves',
      
      // Colors
      'röd': 'red',
      'blå': 'blue',
      'grön': 'green',
      'gul': 'yellow',
      'svart': 'black',
      'vit': 'white',
      'orange': 'orange',
      'lila': 'purple',
      'rosa': 'pink',
      'brun': 'brown',
      
      // Time
      'morgon': 'morning',
      'natt': 'night',
      'dag': 'day',
      'tid': 'time',
      'vecka': 'week',
      'månad': 'month',
      'år': 'year',
      'timme': 'hour',
      'minut': 'minute',
      
      // Family and people
      'vän': 'friend',
      'familj': 'family',
      'lärare': 'teacher',
      'elev': 'student',
      'mamma': 'mother',
      'pappa': 'father',
      'bror': 'brother',
      'syster': 'sister',
      'farmor': 'grandmother',
      'farfar': 'grandfather',
      
      // Activities
      'spel': 'game',
      'leksak': 'toy',
      'present': 'gift',
      'fest': 'party',
      'resa': 'trip',
      'idrott': 'sport',
      'dans': 'dance',
      'målning': 'painting',
      
      // Weather and elements
      'vind': 'wind',
      'eld': 'fire',
      'jord': 'earth',
      'luft': 'air',
      'mol': 'cloud',
      'åska': 'thunder',
      'blixt': 'lightning',
      'dimma': 'fog',
      
      // Body parts
      'hand': 'hand',
      'öga': 'eye',
      'mun': 'mouth',
      'näsa': 'nose',
      'öra': 'ear',
      'hår': 'hair',
      'ben': 'leg',
      'arm': 'arm',
      'huvud': 'head',
      'fot': 'foot',
      
      // Numbers
      'ett': 'one',
      'två': 'two',
      'tre': 'three',
      'fyra': 'four',
      'fem': 'five',
      'sex': 'six',
      'sju': 'seven',
      'åtta': 'eight',
      'nio': 'nine',
      'tio': 'ten',
      
      // School subjects
      'matematik': 'mathematics',
      'engelska': 'english',
      'svenska': 'swedish',
      'historia': 'history',
      'geografi': 'geography',
      'biologi': 'biology',
      'kemi': 'chemistry',
      'fysik': 'physics',
      'konst': 'art',
      'musik': 'music'
    }
    return translations[swedishWord.toLowerCase()] || swedishWord
  }

  // Smart sentence generation system that works with ANY word
  const generateComplexSentence = (englishWord: string, index: number, totalWords: number): { partialSentence: string, hint: string } => {
    // Advanced word analysis and intelligent sentence generation
    return generateAdvancedSentence(englishWord, index)
  }

  // Advanced sentence generation for any word
  const generateAdvancedSentence = (word: string, index: number): { partialSentence: string, hint: string } => {
    const wordLower = word.toLowerCase()
    
    // Deep word analysis
    const wordAnalysis = analyzeWordAdvanced(wordLower)
    
    // Generate sophisticated sentence based on analysis
    const sentence = generateSophisticatedSentence(wordAnalysis, index)
    
    // Generate intelligent hint based on analysis
    const hint = generateIntelligentHint(wordAnalysis)
    
    return { partialSentence: sentence, hint }
  }

  // Advanced word analysis system
  const analyzeWordAdvanced = (word: string) => {
    const analysis = {
      word: word,
      length: word.length,
      syllables: estimateSyllables(word),
      complexity: analyzeComplexity(word),
      semantic: analyzeSemanticCategory(word),
      morphological: analyzeMorphology(word),
      context: analyzeContextualUsage(word)
    }
    
    return analysis
  }

  // Estimate syllables for better sentence complexity
  const estimateSyllables = (word: string): number => {
    const vowels = word.match(/[aeiouy]/gi) || []
    const syllableCount = vowels.length
    
    // Adjust for common patterns
    if (word.endsWith('e') && syllableCount > 1) return syllableCount - 1
    if (word.includes('tion') || word.includes('sion')) return syllableCount + 1
    
    return Math.max(1, syllableCount)
  }

  // Analyze word complexity
  const analyzeComplexity = (word: string) => {
    return {
      isSimple: word.length <= 4,
      isMedium: word.length > 4 && word.length <= 7,
      isComplex: word.length > 7,
      hasCompound: word.includes('-') || word.includes(' '),
      hasPrefix: /^(un|re|pre|dis|in|im|il|ir)/.test(word),
      hasSuffix: /(ing|ed|er|est|ly|ful|ous|less|ness|ment|tion|sion)$/.test(word)
    }
  }

  // Analyze semantic category more intelligently
  const analyzeSemanticCategory = (word: string) => {
    const wordLower = word.toLowerCase()
    // Expanded semantic categories with more sophisticated detection
    const categories = {
      // Mythological and fantasy
      mythical: ['demon', 'dragon', 'unicorn', 'phoenix', 'griffin', 'centaur', 'mermaid', 'fairy', 'wizard', 'witch', 'vampire', 'werewolf', 'ghost', 'spirit', 'angel', 'devil', 'god', 'goddess', 'titan', 'nymph'],
      
      // Supernatural and horror
      supernatural: ['monster', 'creature', 'beast', 'fiend', 'specter', 'phantom', 'apparition', 'shadow', 'darkness', 'evil', 'curse', 'magic', 'spell', 'enchantment', 'hex', 'jinx'],
      
      // Advanced emotions and states
      emotions: ['ecstasy', 'melancholy', 'euphoria', 'despair', 'serenity', 'fury', 'bliss', 'anguish', 'tranquility', 'rage', 'elation', 'grief', 'joy', 'sorrow', 'hope', 'fear'],
      
      // Abstract concepts
      abstract: ['freedom', 'justice', 'beauty', 'truth', 'wisdom', 'courage', 'honor', 'loyalty', 'faith', 'love', 'hate', 'peace', 'war', 'life', 'death', 'time', 'space'],
      
      // Advanced nature and phenomena
      nature: ['volcano', 'tsunami', 'hurricane', 'tornado', 'earthquake', 'avalanche', 'lightning', 'thunder', 'rainbow', 'aurora', 'meteor', 'comet', 'galaxy', 'nebula', 'blackhole'],
      
      // Advanced technology and science
      technology: ['quantum', 'nano', 'cyber', 'digital', 'virtual', 'artificial', 'intelligence', 'algorithm', 'database', 'network', 'satellite', 'telescope', 'microscope', 'laboratory'],
      
      // Advanced human concepts
      human: ['philosophy', 'psychology', 'sociology', 'anthropology', 'archaeology', 'paleontology', 'astronomy', 'chemistry', 'physics', 'mathematics', 'literature', 'poetry', 'art', 'music'],
      
      // Advanced activities and processes
      activities: ['meditation', 'contemplation', 'reflection', 'analysis', 'synthesis', 'evaluation', 'creation', 'destruction', 'transformation', 'evolution', 'revolution', 'innovation'],
      
      // Advanced qualities and characteristics
      qualities: ['magnificent', 'extraordinary', 'remarkable', 'exceptional', 'outstanding', 'brilliant', 'genius', 'masterful', 'exquisite', 'sublime', 'divine', 'infinite', 'eternal', 'mysterious']
    }

    // Check each category
    for (const [category, words] of Object.entries(categories)) {
      if (words.includes(wordLower)) {
        return { category, confidence: 'high' }
      }
    }

    // Pattern-based detection for unknown words
    if (word.endsWith('ology')) return { category: 'human', confidence: 'medium' }
    if (word.endsWith('ism')) return { category: 'abstract', confidence: 'medium' }
    if (word.endsWith('tion') || word.endsWith('sion')) return { category: 'abstract', confidence: 'medium' }
    if (word.endsWith('ness') || word.endsWith('ment')) return { category: 'abstract', confidence: 'medium' }
    if (word.endsWith('ful') || word.endsWith('ous')) return { category: 'qualities', confidence: 'medium' }
    
    // Default based on word characteristics
    if (word.length > 8) return { category: 'abstract', confidence: 'low' }
    if (word.length > 6) return { category: 'qualities', confidence: 'low' }
    
    return { category: 'general', confidence: 'low' }
  }

  // Analyze morphological patterns
  const analyzeMorphology = (word: string) => {
    return {
      isNoun: /^(the|a|an)\s/.test(word) || /[a-z]+$/.test(word),
      isVerb: /(ing|ed|s)$/.test(word),
      isAdjective: /(ful|ous|less|able|ible|al|ic|ive|ous|y)$/.test(word),
      isAdverb: /ly$/.test(word),
      isPlural: /s$/.test(word) && !/(ss|sh|ch|x|z)$/.test(word),
      hasCompound: /[A-Z][a-z]+/.test(word) || word.includes('-')
    }
  }

  // Analyze contextual usage patterns
  const analyzeContextualUsage = (word: string) => {
    return {
      isFormal: /^(the|a|an)\s/.test(word) || word.length > 8,
      isTechnical: /(ology|ism|tion|sion|ment|ness)$/.test(word),
      isPoetic: /(beauty|love|heart|soul|spirit|dream|hope|faith)/.test(word),
      isDramatic: /(epic|legendary|mythical|ancient|eternal|infinite|mysterious)/.test(word),
      isDescriptive: /(magnificent|extraordinary|remarkable|exceptional|outstanding)/.test(word)
    }
  }

  // Generate sophisticated sentences based on advanced analysis
  const generateSophisticatedSentence = (analysis: any, index: number): string => {
    const { semantic, complexity, morphological, context } = analysis
    
    // Simplified sentence templates based on semantic category
    const simplifiedTemplates: { [key: string]: string[] } = {
      mythical: [
        'I read a story about a ...',
        'The ... was very powerful',
        'I dreamed about a ...',
        'The ... lived in a castle',
        'I want to meet a ...'
      ],
      supernatural: [
        'The night was full of ...',
        'I saw a ... in the dark',
        'The ... scared me',
        'I heard a ... nearby',
        'The ... was invisible'
      ],
      emotions: [
        'I feel very ... today',
        'My friend was ... yesterday',
        'The movie made me ...',
        'I get ... when I think about it',
        'Everyone was ... at the party'
      ],
      abstract: [
        'I learned about ... in school',
        'The idea of ... is interesting',
        'I think about ... a lot',
        'The concept of ... is important',
        'I want to understand ...'
      ],
      nature: [
        'I saw a ... in nature',
        'The ... was very big',
        'I learned about ... in science',
        'The ... changed the landscape',
        'I want to visit the ...'
      ],
      technology: [
        'I use ... every day',
        'The new ... is amazing',
        'I learned how to use ...',
        'The ... helps me work',
        'I want to buy a ...'
      ],
      human: [
        'I study ... in school',
        'The field of ... is interesting',
        'I want to learn more about ...',
        'The subject of ... is important',
        'I enjoy learning about ...'
      ],
      activities: [
        'I practice ... every day',
        'The art of ... is difficult',
        'I want to learn ...',
        'The practice of ... helps me',
        'I enjoy doing ...'
      ],
      qualities: [
        'The performance was ...',
        'Her work was very ...',
        'The experience was ...',
        'His talent was ...',
        'The moment was ...'
      ],
      general: [
        'I learned about the ... today',
        'The ... was very interesting',
        'I want to know more about ...',
        'The ... was amazing',
        'I like the ...'
      ]
    }

    // Get templates for the semantic category
    const templates = simplifiedTemplates[semantic.category as keyof typeof simplifiedTemplates] || simplifiedTemplates.general
    const templateIndex = index % templates.length
    
    return templates[templateIndex]
  }

  // Generate intelligent hints based on advanced analysis
  const generateIntelligentHint = (analysis: any): string => {
    const { semantic, complexity, morphological, context } = analysis
    
    const simpleHints: { [key: string]: string[] } = {
      // Mythological and fantasy
      mythical: [
        'This is a creature from stories and fairy tales',
        'This is a magical or legendary being',
        'This is something from imagination',
        'This is a creature that doesn\'t exist in real life',
        'This is from myths and legends'
      ],
      // Supernatural and horror
      supernatural: [
        'This is not natural',
        'This is scary or mysterious',
        'This is supernatural',
        'This cannot be explained',
        'This is spooky or ghostly'
      ],
      // Advanced emotions and states
      emotions: [
        'This is how you feel',
        'This is an emotion people have',
        'This describes a feeling',
        'This is about your mood',
        'This is how someone might feel'
      ],
      // Abstract concepts
      abstract: [
        'This is an idea or concept',
        'This is not a physical thing',
        'This represents an idea',
        'This is an important concept',
        'This is something people believe in'
      ],
      // Advanced nature and phenomena
      nature: [
        'This is found in nature',
        'This is a natural event or feature',
        'This describes something natural',
        'This is something you find in nature',
        'This is a natural force or phenomenon'
      ],
      // Advanced technology and science
      technology: [
        'This is a modern device or tool',
        'This is scientific or technological',
        'This relates to technology',
        'This uses electricity',
        'This is a modern invention'
      ],
      // Advanced human concepts
      human: [
        'This is a subject you study',
        'This is a field of knowledge',
        'This represents a subject',
        'This is something people learn about',
        'This is an area of study'
      ],
      // Advanced activities and processes
      activities: [
        'This is something you can do',
        'This is a practice or activity',
        'This describes an activity',
        'This requires skill',
        'This is something you practice'
      ],
      // Advanced qualities and characteristics
      qualities: [
        'This describes how something is',
        'This is a characteristic or quality',
        'This describes a quality',
        'This makes something special',
        'This describes how good something is'
      ],
      // General
      general: [
        'Think about what this word means',
        'What could fit in this blank?',
        'Use your knowledge of this word',
        'What makes sense here?',
        'What word fits best?'
      ]
    }

    // Get hints for the semantic category
    const hints = simpleHints[semantic.category as keyof typeof simpleHints] || simpleHints.general
    const hintIndex = Math.floor(Math.random() * hints.length)
    
    return hints[hintIndex]
  }

  const currentSentence = sentenceTemplates[currentSentenceIndex]

  useEffect(() => {
    if (isCorrect !== null) {
      const timer = setTimeout(() => {
        if (isCorrect) {
          handleNextSentence()
        } else {
          setUserInput('')
          setIsCorrect(null)
          setShowHint(false)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isCorrect])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return
    
    const correct = userInput.toLowerCase().trim() === currentSentence.englishWord.toLowerCase()
    
    if (correct) {
      setIsCorrect(true)
      setScore(score + 20) // Remove the 0.25x scaling here - it will be applied in finishGame
      setStory(prev => [...prev, currentSentence.completedSentence])
      void logWordAttempt({ word: currentSentence.englishWord, correct: true, gameType: 'story', context: trackingContext })
    } else {
      setIsCorrect(false)
      setScore(Math.max(0, score - 3)) // Remove the 0.25x scaling here - it will be applied in finishGame
      setShowHint(true)
      void logWordAttempt({ word: currentSentence.englishWord, correct: false, gameType: 'story', context: trackingContext })
    }
  }

  const handleNextSentence = () => {
    if (currentSentenceIndex < sentenceTemplates.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1)
      setUserInput('')
      setIsCorrect(null)
      setShowHint(false)
    } else {
      finishGame()
    }
  }

  const finishGame = async () => {
    // Apply the same scaling that updateStudentProgress uses
    const SCORE_MULTIPLIER = 0.25
    const scaledScore = Math.max(0, Math.round(score * SCORE_MULTIPLIER))
    const [diminished, meta] = await Promise.all([
      previewDiminishedPoints(scaledScore, 'story', trackingContext),
      getDiminishingMeta('story', trackingContext)
    ])
    setAwardedPoints(diminished)
    setDiminishInfo(meta)
    
    // Send the diminished score to the parent component for display
    onScoreUpdate(diminished)
    
    // Update permanent student progress (server also applies diminishing)
    void updateStudentProgress(scaledScore, 'story', trackingContext)
    
    setGameFinished(true)
    
    // Calculate accuracy and sentences created
    const sentencesCreated = story.length
    const accuracy = Math.round((sentencesCreated / sentenceTemplates.length) * 100)
    
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'story', { 
        score, 
        durationSec: duration, 
        accuracyPct: accuracy,
        details: { sentences_created: sentencesCreated, total_words: words.length } 
      })
    } else {
      void endGameSession(sessionId, 'story', { 
        score, 
        accuracyPct: accuracy,
        details: { sentences_created: sentencesCreated, total_words: words.length } 
      })
    }
  }

  const restartGame = () => {
    setCurrentSentenceIndex(0)
    setUserInput('')
    setIsCorrect(null)
    setScore(0)
    setStory([])
    setShowHint(false)
    setGameFinished(false)
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('story', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }

  // Don't render until sentences are generated
  if (sentenceTemplates.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Creating your story...</p>
        </div>
      </div>
    )
  }

  if (gameFinished) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-3xl w-full text-center shadow-2xl">
          <div className="mb-6">
            {score >= 150 ? (
              <div className="text-6xl mb-4">🏆</div>
            ) : score >= 100 ? (
              <div className="text-6xl mb-4">🥈</div>
            ) : (
              <div className="text-6xl mb-4">🎯</div>
            )}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Story Complete!</h2>
            <p className="text-gray-600">You scored {awardedPoints} points!</p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-semibold text-yellow-600">{awardedPoints} points</span>
          </div>
          {diminishInfo.prior > 0 && (
            <div className="mb-4 text-sm text-gray-600">Diminishing returns: −20% x {diminishInfo.prior} (×{diminishInfo.factor.toFixed(2)})</div>
          )}

          {/* Show the completed story */}
          <div className="mb-6 text-left">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
              Your Complete Story:
            </h3>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 max-h-60 overflow-y-auto border border-blue-200">
              <div className="prose prose-sm max-w-none">
                {story.map((sentence, index) => (
                  <p key={index} className="text-gray-700 mb-3 leading-relaxed">
                    {sentence}
                  </p>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={restartGame}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Write Another Story</span>
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📝 Story Builder</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Progress and Score */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-2 rounded-full border border-yellow-200">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-800">{Math.round(score * 0.25)} points</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-full border border-blue-200">
              <span className="text-blue-800 font-medium">
                Part {currentSentenceIndex + 1} of {sentenceTemplates.length}
              </span>
            </div>
          </div>
        </div>

        {/* Vocabulary Word List */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-green-600" />
            Your Vocabulary Words:
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex flex-wrap gap-2 justify-center">
              {words.map((word, index) => {
                const completedWords = getCompletedWords()
                const isCompleted = completedWords.includes(word.toLowerCase())
                return (
                  <div
                    key={index}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isCompleted
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    {word}
                    {isCompleted && (
                      <span className="ml-2 text-green-600">✓</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">
              {isCorrect === true ? (
                <span className="text-green-600 font-medium">Great job! Keep going!</span>
              ) : (
                <span>Choose the right word from your vocabulary list</span>
              )}
            </p>
          </div>
        </div>

        {/* Current Story Display */}
        {story.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
              Your Story So Far:
            </h3>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 max-h-32 overflow-y-auto border border-blue-200">
              {story.map((sentence, index) => (
                <p key={index} className="text-gray-700 mb-1 leading-relaxed">
                  {sentence}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Current Sentence */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center shadow-lg">
            <h3 className="text-2xl font-bold mb-4">Complete the sentence:</h3>
            
            {/* Partial sentence */}
            <div className="mb-6">
              <div className="text-3xl font-bold leading-relaxed">
                {currentSentence.partialSentence}
              </div>
            </div>

            {/* Hint */}
            <div className="text-lg text-blue-100">
              <p>💡 Hint: {currentSentence.hint}</p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="text-center">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              What word fits in the blank? Type your answer:
            </label>
            <div className="flex items-center justify-center space-x-4">
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                placeholder="Type the missing word..."
                className="flex-1 max-w-md px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg bg-gray-50 transition-colors"
                autoComplete="off"
                autoFocus
                disabled={isCorrect !== null}
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isCorrect !== null}
                className="bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </form>

        {/* Feedback */}
        {isCorrect !== null && (
          <div className={`p-4 rounded-lg text-center font-medium ${
            isCorrect 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {isCorrect ? (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Excellent! "{currentSentence.englishWord}" is perfect for this sentence!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span>Not quite right. The correct answer is "{currentSentence.englishWord}".</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Hint */}
        {showHint && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Need more help?</span>
            </div>
            <p className="text-yellow-700">
              Think about the context: {currentSentence.hint}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>💡 Read the sentence and think about what word fits best</p>
          <p>🎯 Use the hint to help you figure out the right word</p>
          <p>📚 Build a complete, coherent story by the end!</p>
        </div>
      </div>
    </div>
  )
}

