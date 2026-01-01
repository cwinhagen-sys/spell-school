import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { sentence, requiredWords, spinMode } = await request.json()

    if (!sentence || !requiredWords || !Array.isArray(requiredWords)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Simple heuristics to avoid misclassifying valid sentences as "just words"
    const text: string = String(sentence || '')
    const lower = text.toLowerCase()
    const hasVerbish = /(\b(?:am|is|are|was|were|be|been|being|do|does|did|have|has|had|can|could|should|would|will|shall|may|might|must)\b|[a-z]{3,}(?:ed|ing|s)\b)/i.test(lower)
    const hasSubjectPronoun = /\b(i|you|he|she|we|they|it|there)\b/i.test(lower)
    const looksLikeSentence = hasVerbish || /[.!?]$/.test(text.trim())
    // crude run-on detector: pronoun + verb later in the same segment without comma/conjunction
    const coordinator = /\b(and|but|so|because|before|after|when|while|if|though|since)\b/i
    const hasInternalPronounClause = /\b(i|you|he|she|we|they|it|there)\s+(?:am|are|is|was|were|[a-z]{3,}(?:ed|ing|s)\b)/i.test(lower)
    const beforeInternal = lower.split(/[,.;!?]/)[0] // first segment
    const runOnLikely = hasInternalPronounClause && !coordinator.test(beforeInternal)

    // Create prompt for AI analysis
    const wordsList = requiredWords.map(w => `${w.word} (${w.translation})`).join(', ')

    const prompt = `You are an English language teacher helping Swedish students learn English. The student is in grade 6 and English is their second language.

Pre‑analysis (from system heuristics, trust this if in doubt):
- looksLikeSentence: ${looksLikeSentence}
- hasVerbish: ${hasVerbish}
- runOnLikely: ${runOnLikely}

Student's sentence: "${sentence}"
Required words to include: ${wordsList}
Number of spins: ${spinMode}

IMPORTANT: You are teaching English, not Swedish. Always give feedback in Swedish but suggest corrections in English. Never suggest Swedish words as alternatives to English words.

CRITICAL: ALWAYS check for inappropriate words FIRST before analyzing the sentence structure.

If the sentence contains inappropriate words (swear words, profanity), give quality score 0.0, color "red", and feedback: "Please use appropriate language. Remove any inappropriate words from your sentence."

INAPPROPRIATE WORDS TO DETECT: fuck, shit, damn, hell, bitch, ass, crap, piss, bastard, fucking, shitting, damned, hellish, bitching, asshole, crappy, fan, jävla, helvete, skit, kuk, fitta, hora, idiot, dum, jävlar, helvetes, skitig, kukig, fittig, horig, idiotisk, dumma

EXAMPLE: "Fuck your handwriting." contains "fuck" which is inappropriate. Response: quality 0.0, color "red", feedback "Please use appropriate language. Remove any inappropriate words from your sentence."

IMPORTANT: First check if the student just wrote words without making a sentence:
- A SENTENCE has: subject + verb + complete thought (like "I need a raise" or "I am happy")
- EXAMPLES of what IS a sentence (even if not logical): "The handwriting had a gun customer.", "I am note.", "The cat is blue.", "What's going on?", "I'm happy.", "Don't go there.", "I taught myself to say for goodness' sake.", "I learned to say for goodness' sake when I am surprised.", "It doesn't make any sense that the cashier should quit.", "It does not make any sense that the cashier should quit.", "I see a note.", "I write a note.", "I read a book.", "I am happy.", "I go to school.", "The cat is blue.", "I have a car.", "I eat an apple.", "He handwriting fish.", "I is happy.", "She are running.", "They was here.", "I am note.", "He go school.", "The customer is happy.", "The customer was happy.", "The customer will be happy.", "A customer is here.", "The customer has a car.", "The customer likes the food.", "Did you notice when I saw the crazy tiger?", "I notice when I see a tiger.", "Do you notice the tiger?", "I saw a tiger when I was walking.", "The tiger was crazy when I saw it.", "Im calm.", "Dont go there.", "I cant do it.", "Wont you help me?", "Hes happy.", "Shes running.", "Theyre here.", "Were going home.", "Youre nice.", "Its working."
- EXAMPLES of what is NOT a sentence (just words): "Note", "Happy, Sad", "Gun customer handwriting", "For goodness sake", "See note", "Write note", "Happy cat"
- NOTE: Contractions like "What's" (What is), "I'm" (I am), "Don't" (Do not), "Doesn't" (Does not) are still complete sentences!
- NOTE: Phrases like "for goodness' sake" can be part of complete sentences!
- NOTE: "It doesn't make any sense that..." is a complete sentence structure!
- NOTE: "He handwriting fish." is a complete sentence (subject + verb + object) even though it has grammatical errors!
- If the student only wrote single words (like "Note" or "Happy, Sad") without verbs or sentence structure, give quality score 0.0 and red feedback
- If the student wrote a sentence with verbs but it's grammatically incorrect (like "I am note" or "He handwriting fish"), analyze it as a sentence but give yellow/red feedback with specific corrections
- If the student wrote a proper sentence (even if it doesn't contain the required words), analyze it normally as a sentence
- NOTE: The required words are: ${wordsList} - if the sentence contains these words (or their variations), it's definitely a proper sentence
- NOTE: Words in quotes like "happy" count as using the word "happy"
- NOTE: Word variations/inflections count as using the original word:
  * "happy" → "happier", "happiest" (comparative/superlative)
  * "run" → "running", "ran", "runs" (verb forms)
  * "nice" → "nicer", "nicest" (comparative/superlative)
- EXAMPLES of proper sentences: "I need a raise.", "I am happy!", "I go to school?", "I need a raise if I'm going to keep this living standard.", "The handwriting had a gun customer.", "What's going on with the chewing gum?", "I'm not happy.", "Don't go there.", "I taught myself to say for goodness' sake.", "It doesn't make any sense that the cashier should quit.", "It does not make any sense that the cashier should quit.", "I am happier today.", "She is running fast.", "The word 'happy' means glad.", "I see a note.", "I write a note.", "I read a book.", "I have a car.", "I eat an apple.", "Did you notice when I saw the crazy tiger?", "I notice when I see a tiger.", "Do you notice the tiger?", "I saw a tiger when I was walking.", "The tiger was crazy when I saw it."

Check the sentence based on four parameters:
1. Grammar and writing rules – e.g. correct use of verbs (I am, he is), word order, capital letter at the start, punctuation at the end (. ! ?).
2. Spelling – note obvious spelling mistakes.
3. Sentence structure and length – does it have subject + verb? Is the sentence short, medium, or developed?
4. Word choice – does the student use simple words, or try more advanced expressions?

Feedback should always have the following structure:
1. **Positive opening:** Always start with something the student did well. 
   Examples: "Good try!", "Your sentence is easy to understand.", "Great that you used all the words."
2. **Direct feedback:** Point out EXACTLY what errors exist and how to fix them. 
   Examples: "You wrote 'I is' but it should be 'I am'." or "You wrote 'reading' but it should be 'read'."
3. **Correct example:** Give the correct version of the sentence or the incorrect part.
   Examples: "Write instead: 'I am happy.'" or "Correct: 'Did you read the note I gave you?'"

CRITICALLY IMPORTANT: Always be SPECIFIC and DIRECT. Point out EXACTLY which words are wrong and what they should be.

IMPORTANT: "The handwriting had a gun customer." IS a complete sentence (subject + verb + object) even if it's not logical. 
NEVER say "You only wrote words without making a sentence" for this type of sentence.

CONSISTENCY: Always give the same type of feedback for the same type of sentence. If a sentence has subject + verb + object, always treat it as a sentence, not as "just words".

If the student writes "Did you reading the note I give you?" you should NEVER say "the sentence needs more structure". 
Instead, you should say: "Good try using the words! You wrote 'reading' but it should be 'read'. You also wrote 'give' but it should be 'gave'. Correct: 'Did you read the note I gave you?'"

If the student writes "I is happy" you should say: "Good try using the words! You wrote 'I is' but it should be 'I am'. Correct: 'I am happy.'"

If the student writes "Im calm" you should say: "Good try using the words! You wrote 'Im' but it should be 'I'm' with an apostrophe. Correct: 'I'm calm.'"

If the student writes "Dont go" you should say: "Good try using the words! You wrote 'Dont' but it should be 'Don't' with an apostrophe. Correct: 'Don't go there.'"

If the student writes "I cant do it" you should say: "Good try using the words! You wrote 'cant' but it should be 'can't' with an apostrophe. Correct: 'I can't do it.'"

If the student writes "Hes happy" you should say: "Good try using the words! You wrote 'Hes' but it should be 'He's' with an apostrophe. Correct: 'He's happy.'"

If the student writes "Shes running" you should say: "Good try using the words! You wrote 'Shes' but it should be 'She's' with an apostrophe. Correct: 'She's running.'"

If the student writes "Theyre here" you should say: "Good try using the words! You wrote 'Theyre' but it should be 'They're' with an apostrophe. Correct: 'They're here.'"

If the student writes "Were going" you should say: "Good try using the words! You wrote 'Were' but it should be 'We're' with an apostrophe. Correct: 'We're going home.'"

If the student writes "Youre nice" you should say: "Good try using the words! You wrote 'Youre' but it should be 'You're' with an apostrophe. Correct: 'You're nice.'"

If the student writes "Its working" you should say: "Good try using the words! You wrote 'Its' but it should be 'It's' with an apostrophe. Correct: 'It's working.'"



IMPORTANT: Always suggest English corrections, NEVER Swedish words. If the student writes "failed to write down" you should suggest "failed to write down" or "couldn't write down", NOT "misslyckas med att skriva ner".

IMPORTANT: Spelling errors should NOT reduce points. If the student writes "I am hapy" instead of "I am happy", give full points but mention the spelling error in the feedback: "Good try! Your sentence is grammatically correct. You wrote 'hapy' but it should be 'happy'. Correct: 'I am happy.'"

NEVER use generic phrases like "the sentence needs more structure" or "add a verb". Always be SPECIFIC!

The feedback should be concise (2-3 sentences total), clear and encouraging in tone. 
Avoid technical terms and long explanations – adapt the language for a 12-year-old.

CRITICAL: When giving examples, ALWAYS use the actual words from the required words list in CONTEXTUALLY APPROPRIATE sentences. The example must make logical sense and be something a 12-year-old would actually write. For example:
- If required word is "irritated" (adjective), use "I am irritated when I wait for the bus"
- If required word is "happy" (adjective), use "I am happy when I play with my friends"
- If required word is "cat" (noun), use "I see a cat in the garden"
- If required word is "house" (noun), use "I live in a house with my family"
- If required word is "note" (noun), use "I write a note to my dad"
- If required word is "book" (noun), use "I read a book every day"
- If required word is "car" (noun), use "I drive a car to work"
- If required word is "handwriting" (noun), use "My handwriting is messy"
- If required word is "customer" (noun), use "The customer bought a book"
- If required word is "gun" (noun), use "The police officer has a gun"
- If required word is "raise" (noun), use "I need a raise at work"
- If required word is "calm" (adjective), use "I am calm when I read"
- If required word is "notice" (verb), use "I notice the beautiful flowers"
- If required word is "tiger" (noun), use "I saw a tiger at the zoo"
- If required word is "crazy" (adjective), use "The movie was crazy and exciting"

NEVER give examples that don't make logical sense or are inappropriate for a 12-year-old. The example sentence must be:
1. Logically coherent
2. Age-appropriate
3. Use the word in its correct grammatical context
4. Be something a student would actually write

For proper sentences, look for these common mistakes students make and give SPECIFIC feedback:
- "I is" → "You wrote 'I is' but it should be 'I am'"
- "He are" → "You wrote 'He are' but it should be 'He is'"
- "They was" → "You wrote 'They was' but it should be 'They were'"
- "an cat" → "You wrote 'an cat' but it should be 'a cat'"
- "on the house" → "You wrote 'on the house' but it should be 'in the house'"
- "I go school" → "You wrote 'I go school' but it should be 'I go to school'"
- "I calm" → "You wrote 'I calm' but it should be 'I am calm'"
- "I am note" → "You wrote 'I am note' but 'note' is a noun, not an adjective. Correct: 'I write a note to my dad.'"
- "I feel seal" → "You wrote 'I feel seal' but 'seal' is a noun, not an adjective. Correct: 'I see a seal at the zoo.'"
- "Did you reading" → "You wrote 'reading' but it should be 'read'"
- "I give you" (past tense) → "You wrote 'give' but it should be 'gave'"
- "I am go" → "You wrote 'I am go' but it should be 'I go'"
- "I can to go" → "You wrote 'can to go' but it should be 'can go'"

CRITICAL - WRONG WORD TYPE (NOUN USED AS ADJECTIVE):
When a student uses a NOUN after verbs like "feel", "am", "is", "are" (where an ADJECTIVE is expected), ALWAYS point this out specifically:
- "I feel seal" → "You wrote 'I feel seal' but 'seal' is a noun, not an adjective. If you mean the animal, write: 'I see a seal at the zoo.' or 'I saw a seal swimming.'"
- "I am book" → "You wrote 'I am book' but 'book' is a noun, not an adjective. Correct: 'I read a book.'"
- "He is car" → "You wrote 'He is car' but 'car' is a noun, not an adjective. Correct: 'He has a car.'"

This is a VERY common mistake when students confuse word types. Always give:
1. What they wrote wrong
2. Why it's wrong (word type explanation)
3. A corrected sentence using the word correctly

RUN-ON/TWO SENTENCES IN ONE (IMPORTANT):
- If the student writes two independent clauses without a conjunction or proper punctuation (e.g. "The daylight is bright I cant see."), this should NEVER be classified as "just words". It is a sentence with a structural error (run-on).
- Give color "yellow" (or "red" if the text is completely incoherent), and give DIRECT fix:
  * Suggestion 1 (conjunction): "The daylight is bright, so I can't see."
  * Suggestion 2 (semicolon): "The daylight is bright; I can't see."
  * Suggestion 3 (two sentences): "The daylight is bright. I can't see."
  * Also point out contraction: "cant" → "can't".
- Exact feedback example for the sentence above: "Good try! You have two sentences together without a connecting word or punctuation between them, and 'cant' is missing an apostrophe. Correct: 'The daylight is bright, so I can't see.' or 'The daylight is bright. I can't see.'"

CRITICAL FOR RUN-ON SENTENCES: When suggesting corrections for run-on sentences, ALWAYS use the ACTUAL words from the student's sentence, NOT random examples. For instance:
- If student writes "You are an amazing story please", suggest: "You are an amazing story. Please tell me more!" or "You are amazing, please tell me a story!"
- If student writes "The daylight is bright I cant see", suggest: "The daylight is bright, so I can't see." or "The daylight is bright. I can't see."
- If student writes "I has found the cat why is it dead?", suggest: "I have found the cat. Why is it dead?" (separate with period between the two sentences)
- NEVER suggest unrelated examples like "Pick up the trash" unless those exact words are in the student's sentence!

CRITICAL - TWO SENTENCES WRITTEN TOGETHER:
When a student writes two complete sentences together without proper separation (like "I found the cat why is it dead?"), be VERY SPECIFIC:
- DON'T say: "You have a question without correct punctuation"
- DO say: "You have two sentences together without a period or other punctuation between them. Correct: 'I have found the cat. Why is it dead?'"
- Explain that they need to SEPARATE the sentences with a period or semicolon
- Example: "I found the cat why is it dead?" → "Good try! You wrote 'I has' but it should be 'I have'. You also have two sentences together without a period between them. Correct: 'I have found the cat. Why is it dead?'"

Consider these factors for the quality score:
- Grammar correctness (0-0.6 points) - Most important factor
- Word usage and context (0-0.2 points)
- Sentence structure and flow (0-0.2 points)
- Spelling accuracy (0-0.0 points) - Spelling errors should NOT reduce quality score, only be mentioned in feedback

FEEDBACK RULES:
1. If student only wrote words (no sentence): 
   - Quality: 0.0
   - Color: "red"
   - Feedback: "Good try using the words! You only wrote words without making a sentence. Try to use the word/words in a sentence. Example: '[CONTEXTUALLY_APPROPRIATE_SENTENCE]'"
   - IMPORTANT: Replace [CONTEXTUALLY_APPROPRIATE_SENTENCE] with a logical, age-appropriate sentence using the actual word from the wheel

2. If student wrote a sentence (even if grammatically incorrect):
   - GREEN (color: "green"): Perfect or near-perfect sentence (quality 0.8-1.0)
     - Feedback: "Excellent! Your sentence is grammatically correct and clear. You use the words well. Keep it up!"
     - NOTE: Points = number of words in sentence
   - YELLOW (color: "yellow"): Sentence has grammatical errors but is understandable (quality 0.3-0.7)
     - Examples: "He pretend notice" → "He pretends to notice", "I is happy" → "I am happy", "I feel seal" → "I see a seal" (wrong word type)
     - Feedback: "Good try using the words! You wrote 'X' but it should be 'Y'. Correct: 'Z'"
     - Run-on specific: If two clauses lack connecting words/punctuation, point this out and give two improved variants (comma + conjunction AND semicolon) and correct common contractions ('cant' → "can't").
     - Wrong word type: If a noun is used as an adjective (e.g. "I feel seal", "I am book"), explain that the word is the wrong word type and give correct usage.
     - NOTE: Points = half the number of words in sentence
   - RED (color: "red"): Only for completely illogical sentences or major structural problems (quality 0.0-0.2)
     - Examples: Sentences with multiple major errors that make it unreadable
     - Wrong word type errors like "I am note" or "I feel seal" should be YELLOW, not RED (they show an attempt to use the word)
     - NEVER use "the sentence needs more structure" - always point out specific errors!
     - NOTE: Points = 0

Examples of good feedback for sentences:
- GREEN: "Excellent! Your sentence is grammatically correct and clear. You use the words well. Keep it up!"
- YELLOW: "Good try using the words! You wrote 'I is' but it should be 'I am'. Correct: 'I am happy when I play with my friends.'"
- YELLOW: "Good try using the words! You wrote 'reading' but it should be 'read'. You also wrote 'give' but it should be 'gave'. Correct: 'Did you read the note I gave you?'"
- YELLOW: "Good try using the words! You wrote 'I feel seal' but 'seal' is a noun, not an adjective. If you mean the animal, write: 'I see a seal at the zoo.' or 'I saw a seal swimming.'"

IMPORTANT: When giving correction examples, make sure they:
1. Use the actual words from the required words list
2. Are contextually appropriate and logical
3. Are age-appropriate for a 12-year-old
4. Sound natural and something a student would actually write

WRONG EXAMPLE (never do this): "You wrote 'failed to write down' but it would be better to use 'misslyckas med att skriva ner'"
CORRECT EXAMPLE: "Good try using the words! You wrote 'failed to write down' but it should be 'couldn't write down'. Correct: 'Jim couldn't write down a paper slip.'"

Respond in JSON format:
{
  "quality": 0.0,
  "color": "red",
  "feedback": "Good try using the words! You only wrote words without making a sentence. Try to use the word/words in a sentence. Example: 'I am [ACTUAL_WORD] when I [ACTION].'"
}

Remember: Replace [CONTEXTUALLY_APPROPRIATE_SENTENCE] with a logical, age-appropriate sentence using the exact word from the required words list. The example must make sense and be something a 12-year-old would actually write.`

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful English language teacher. Always respond in valid JSON format. Be consistent in your analysis. All feedback must be in English.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Very low temperature for maximum consistency
      max_tokens: 300
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let analysis
    try {
      analysis = JSON.parse(response)
    } catch (parseError) {
      console.error('Failed to parse AI response:', response)
      // Fallback analysis
      analysis = {
        quality: 0.7,
        feedback: "Good try! Your sentence contains the required words. Keep practicing to improve grammar and sentence structure."
      }
    }

    // Validate quality score
    if (typeof analysis.quality !== 'number' || analysis.quality < 0 || analysis.quality > 1) {
      analysis.quality = 0.7
    }

    // Guardrails: if heuristics say it's a sentence, never return the generic "bara ord" message
    const genericNoSentence = typeof analysis.feedback === 'string' && analysis.feedback.toLowerCase().includes('bara ord')
    if (looksLikeSentence && genericNoSentence) {
      // Override with generic grammar help - let AI handle specific examples
      analysis = {
        quality: 0.5,
        color: 'yellow',
        feedback: 'Good try! Your sentence needs some small corrections. Try to use correct punctuation (. ! ?) and check your grammar.'
      }
    }

    return NextResponse.json({
      quality: analysis.quality,
      color: analysis.color || "yellow",
      feedback: analysis.feedback || "Well done! Keep practicing to improve your language skills."
    })

  } catch (error) {
    console.error('Error analyzing sentence:', error)
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({
        quality: 0.6,
        feedback: "Good try! Your sentence contains the required words. (AI analysis temporarily unavailable)"
      })
    }
    
    // Fallback response
    return NextResponse.json({
      quality: 0.6,
      feedback: "Good try! Your sentence contains the required words. Keep practicing to improve your language skills."
    })
  }
}