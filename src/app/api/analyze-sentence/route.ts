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

Kontrollera meningen utifrån fyra parametrar:
1. Grammatik och skrivregler – t.ex. korrekt användning av verb (I am, he is), ordföljd, stor bokstav i början, skiljetecken på slutet (. ! ?).
2. Stavning – uppmärksamma uppenbara felstavningar.
3. Meningens struktur och längd – finns subjekt + verb? Är meningen kort, lagom eller utvecklad?
4. Ordval – använder eleven enkla ord, eller provar mer avancerade uttryck?

Feedback ska alltid ha följande struktur:
1. **Positiv inledning:** Börja alltid med något eleven gjort bra. 
   Exempel: "Bra försök!", "Din mening är lätt att förstå.", "Toppen att du använder hela ordlistan."
2. **Direkt feedback:** Peka ut EXAKT vilka fel som finns och hur de ska rättas. 
   Exempel: "Du skriver 'I is' men det ska vara 'I am'." eller "Du skriver 'reading' men det ska vara 'read'."
3. **Korrekt exempel:** Ge den korrekta versionen av meningen eller den felaktiga delen.
   Exempel: "Skriv istället: 'I am happy.'" eller "Rätt: 'Did you read the note I gave you?'"

KRITISKT VIKTIGT: Var ALLTID SPECIFIK och DIREKT. Peka ut EXAKT vilka ord som är fel och vad de ska vara.

VIKTIGT: "The handwriting had a gun customer." ÄR en fullständig mening (subjekt + verb + objekt) även om den inte är logisk. 
ALDRIG säg "Du skrev bara ord utan att göra en mening" för denna typ av mening.

KONSEKVENS: Ge ALLTID samma typ av feedback för samma typ av mening. Om en mening har subjekt + verb + objekt, behandla den ALLTID som en mening, inte som "bara ord".

Om eleven skriver "Did you reading the note I give you?" ska du ALDRIG säga "meningen behöver mer struktur". 
Istället ska du säga: "Bra försök att använda orden! Du skriver 'reading' men det ska vara 'read'. Du skriver också 'give' men det ska vara 'gave'. Rätt: 'Did you read the note I gave you?'"

Om eleven skriver "I is happy" ska du säga: "Bra försök att använda orden! Du skriver 'I is' men det ska vara 'I am'. Rätt: 'I am happy.'"

Om eleven skriver "Im calm" ska du säga: "Bra försök att använda orden! Du skriver 'Im' men det ska vara 'I'm' med apostrof. Rätt: 'I'm calm.'"

Om eleven skriver "Dont go" ska du säga: "Bra försök att använda orden! Du skriver 'Dont' men det ska vara 'Don't' med apostrof. Rätt: 'Don't go there.'"

Om eleven skriver "I cant do it" ska du säga: "Bra försök att använda orden! Du skriver 'cant' men det ska vara 'can't' med apostrof. Rätt: 'I can't do it.'"

Om eleven skriver "Hes happy" ska du säga: "Bra försök att använda orden! Du skriver 'Hes' men det ska vara 'He's' med apostrof. Rätt: 'He's happy.'"

Om eleven skriver "Shes running" ska du säga: "Bra försök att använda orden! Du skriver 'Shes' men det ska vara 'She's' med apostrof. Rätt: 'She's running.'"

Om eleven skriver "Theyre here" ska du säga: "Bra försök att använda orden! Du skriver 'Theyre' men det ska vara 'They're' med apostrof. Rätt: 'They're here.'"

Om eleven skriver "Were going" ska du säga: "Bra försök att använda orden! Du skriver 'Were' men det ska vara 'We're' med apostrof. Rätt: 'We're going home.'"

Om eleven skriver "Youre nice" ska du säga: "Bra försök att använda orden! Du skriver 'Youre' men det ska vara 'You're' med apostrof. Rätt: 'You're nice.'"

Om eleven skriver "Its working" ska du säga: "Bra försök att använda orden! Du skriver 'Its' men det ska vara 'It's' med apostrof. Rätt: 'It's working.'"



VIKTIGT: Alltid föreslå engelska korrigeringar, ALDRIG svenska ord. Om eleven skriver "failed to write down" ska du föreslå "failed to write down" eller "couldn't write down", INTE "misslyckas med att skriva ner".

VIKTIGT: Stavfel ska INTE dra av poäng. Om eleven skriver "I am hapy" istället för "I am happy", ge full poäng men nämn stavfelet i feedbacken: "Bra försök! Din mening är grammatiskt korrekt. Du skriver 'hapy' men det ska vara 'happy'. Rätt: 'I am happy.'"

ALDRIG använd generiska fraser som "meningen behöver mer struktur" eller "lägg till verb". Var alltid SPECIFIK!

Feedbacken ska vara kortfattad (2–3 meningar totalt), tydlig och uppmuntrande i tonen. 
Undvik tekniska termer och långa förklaringar – anpassa språket till en 12-åring.

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

For proper sentences, look for these common mistakes Swedish students make and give SPECIFIC feedback:
- "I is" → "Du skriver 'I is' men det ska vara 'I am'"
- "He are" → "Du skriver 'He are' men det ska vara 'He is'"
- "They was" → "Du skriver 'They was' men det ska vara 'They were'"
- "an cat" → "Du skriver 'an cat' men det ska vara 'a cat'"
- "on the house" → "Du skriver 'on the house' men det ska vara 'in the house'"
- "I go school" → "Du skriver 'I go school' men det ska vara 'I go to school'"
- "I calm" → "Du skriver 'I calm' men det ska vara 'I am calm'"
- "I am note" → "Du skriver 'I am note' men 'note' är ett substantiv, inte ett adjektiv. Rätt: 'I write a note to my dad.'"
- "I feel seal" → "Du skriver 'I feel seal' men 'seal' är ett substantiv (säl), inte ett adjektiv. Rätt: 'I see a seal at the zoo.'"
- "Did you reading" → "Du skriver 'reading' men det ska vara 'read'"
- "I give you" (past tense) → "Du skriver 'give' men det ska vara 'gave'"
- "I am go" → "Du skriver 'I am go' men det ska vara 'I go'"
- "I can to go" → "Du skriver 'can to go' men det ska vara 'can go'"

CRITICAL - WRONG WORD TYPE (NOUN USED AS ADJECTIVE):
When a student uses a NOUN after verbs like "feel", "am", "is", "are" (where an ADJECTIVE is expected), ALWAYS point this out specifically:
- "I feel seal" → "Du skriver 'I feel seal' men 'seal' är ett substantiv, inte ett adjektiv. Om du menar 'säl' (djuret), skriv: 'I see a seal at the zoo.' eller 'I saw a seal swimming.' Om du tänkte på något annat ord, försök igen."
- "I am book" → "Du skriver 'I am book' men 'book' är ett substantiv, inte ett adjektiv. Rätt: 'I read a book.'"
- "He is car" → "Du skriver 'He is car' men 'car' är ett substantiv, inte ett adjektiv. Rätt: 'He has a car.'"

This is a VERY common mistake when Swedish students confuse word types. Always give:
1. What they wrote wrong
2. Why it's wrong (word type explanation)
3. A corrected sentence using the word correctly

RUN-ON/TVÅ MENINGAR I EN (IMPORTANT):
- Om eleven skriver två självständiga satser utan konjunktion eller korrekt skiljetecken (t.ex. "The daylight is bright I cant see."), ska detta ALDRIG klassas som "bara ord". Det är en mening med ett strukturfel (run-on).
- Ge färg "yellow" (eller "red" om texten är helt osammanhängande), och ge DIREKT fix:
  * Förslag 1 (konjunktion): "The daylight is bright, so I can't see."
  * Förslag 2 (semikolon): "The daylight is bright; I can't see."
  * Förslag 3 (två meningar): "The daylight is bright. I can't see."
  * Påpeka också kontraktion: "cant" → "can't".
- Exakt feedback-exempel för meningen ovan: "Bra försök! Du har två satser ihop utan bindeord eller skiljetecken mellan dem, och 'cant' saknar apostrof. Rätt: 'The daylight is bright, so I can't see.' eller 'The daylight is bright. I can't see.'"

CRITICAL FOR RUN-ON SENTENCES: When suggesting corrections for run-on sentences, ALWAYS use the ACTUAL words from the student's sentence, NOT random examples. For instance:
- If student writes "You are an amazing story please", suggest: "You are an amazing story. Please tell me more!" eller "You are amazing, please tell me a story!"
- If student writes "The daylight is bright I cant see", suggest: "The daylight is bright, so I can't see." eller "The daylight is bright. I can't see."
- If student writes "I has found the cat why is it dead?", suggest: "I have found the cat. Why is it dead?" (separate with period between the two sentences)
- NEVER suggest unrelated examples like "Pick up the trash" unless those exact words are in the student's sentence!

CRITICAL - TWO SENTENCES WRITTEN TOGETHER:
When a student writes two complete sentences together without proper separation (like "I found the cat why is it dead?"), be VERY SPECIFIC:
- DON'T say: "Du har en fråga utan korrekt skiljetecken"
- DO say: "Du har två meningar ihop utan punkt eller annat skiljetecken mellan dem. Rätt: 'I have found the cat. Why is it dead?'"
- Explain that they need to SEPARATE the sentences with a period (punkt) or semicolon (semikolon)
- Example: "I found the cat why is it dead?" → "Bra försök! Du skriver 'I has' men det ska vara 'I have'. Du har också två meningar ihop utan punkt mellan dem. Rätt: 'I have found the cat. Why is it dead?'"

Consider these factors for the quality score:
- Grammar correctness (0-0.6 points) - Most important factor
- Word usage and context (0-0.2 points)
- Sentence structure and flow (0-0.2 points)
- Spelling accuracy (0-0.0 points) - Spelling errors should NOT reduce quality score, only be mentioned in feedback

FEEDBACK RULES:
1. If student only wrote words (no sentence): 
   - Quality: 0.0
   - Color: "red"
   - Feedback: "Bra försök att använda orden! Du skrev bara ord utan att göra en mening. Försök att använda ordet/orden i en mening. Ex: '[CONTEXTUALLY_APPROPRIATE_SENTENCE]'"
   - IMPORTANT: Replace [CONTEXTUALLY_APPROPRIATE_SENTENCE] with a logical, age-appropriate sentence using the actual word from the wheel

2. If student wrote a sentence (even if grammatically incorrect):
   - GREEN (color: "green"): Perfect or near-perfect sentence (quality 0.8-1.0)
     - Feedback: "Utmärkt! Din mening är grammatiskt korrekt och tydlig. Du använder orden på ett bra sätt. Fortsätt så!"
     - NOTE: Points = number of words in sentence
   - YELLOW (color: "yellow"): Sentence has grammatical errors but is understandable (quality 0.3-0.7)
     - Examples: "He pretend notice" → "He pretends to notice", "I is happy" → "I am happy", "I feel seal" → "I see a seal" (wrong word type)
     - Feedback: "Bra försök att använda orden! Du skriver 'X' men det ska vara 'Y'. Rätt: 'Z'"
     - Run-on specific: Om två satser saknar bindeord/skiljetecken, påpeka detta och ge två förbättrade varianter (komma + konjunktion OCH semikolon) samt rätta vanliga kontraktioner ('cant' → "can't").
     - Wrong word type: Om substantiv används som adjektiv (t.ex. "I feel seal", "I am book"), förklara att ordet är fel ordtyp och ge korrekt användning.
     - NOTE: Points = half the number of words in sentence
   - RED (color: "red"): Only for completely illogical sentences or major structural problems (quality 0.0-0.2)
     - Examples: Sentences with multiple major errors that make it unreadable
     - Wrong word type errors like "I am note" or "I feel seal" should be YELLOW, not RED (they show an attempt to use the word)
     - ALDRIG använd "meningen behöver mer struktur" - peka alltid ut specifika fel!
     - NOTE: Points = 0

Examples of good feedback for sentences:
- GREEN: "Utmärkt! Din mening är grammatiskt korrekt och tydlig. Du använder orden på ett bra sätt. Fortsätt så!"
- YELLOW: "Bra försök att använda orden! Du skriver 'I is' men det ska vara 'I am'. Rätt: 'I am happy when I play with my friends.'"
- YELLOW: "Bra försök att använda orden! Du skriver 'reading' men det ska vara 'read'. Du skriver också 'give' men det ska vara 'gave'. Rätt: 'Did you read the note I gave you?'"
- YELLOW: "Bra försök att använda orden! Du skriver 'I feel seal' men 'seal' är ett substantiv (säl), inte ett adjektiv. Om du menar djuret, skriv: 'I see a seal at the zoo.' eller 'I saw a seal swimming.'"

IMPORTANT: When giving correction examples, make sure they:
1. Use the actual words from the required words list
2. Are contextually appropriate and logical
3. Are age-appropriate for a 12-year-old
4. Sound natural and something a student would actually write

WRONG EXAMPLE (never do this): "Du skriver 'failed to write down' men det skulle vara bättre att använda 'misslyckas med att skriva ner'"
CORRECT EXAMPLE: "Bra försök att använda orden! Du skriver 'failed to write down' men det ska vara 'couldn't write down'. Rätt: 'Jim couldn't write down a paper slip.'"

Respond in JSON format:
{
  "quality": 0.0,
  "color": "red",
  "feedback": "Bra försök att använda orden! Du skrev bara ord utan att göra en mening. Försök att använda ordet/orden i en mening. Ex: 'I am [ACTUAL_WORD] when I [ACTION].'"
}

Remember: Replace [CONTEXTUALLY_APPROPRIATE_SENTENCE] with a logical, age-appropriate sentence using the exact word from the required words list. The example must make sense and be something a 12-year-old would actually write.`

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful Swedish language teacher. Always respond in valid JSON format. Be consistent in your analysis.'
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
        feedback: "Bra försök! Din mening innehåller de nödvändiga orden. Fortsätt öva för att förbättra grammatiken och meningsstrukturen."
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
        feedback: 'Bra försök! Din mening behöver några små rättningar. Försök att använda rätt skiljetecken (. ! ?) och kontrollera grammatiken.'
      }
    }

    return NextResponse.json({
      quality: analysis.quality,
      color: analysis.color || "yellow",
      feedback: analysis.feedback || "Bra jobbat! Fortsätt öva för att förbättra dina språkfärdigheter."
    })

  } catch (error) {
    console.error('Error analyzing sentence:', error)
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({
        quality: 0.6,
        feedback: "Bra försök! Din mening innehåller de nödvändiga orden. (AI-analys tillfälligt otillgänglig)"
      })
    }
    
    // Fallback response
    return NextResponse.json({
      quality: 0.6,
      feedback: "Bra försök! Din mening innehåller de nödvändiga orden. Fortsätt öva för att förbättra dina språkfärdigheter."
    })
  }
}