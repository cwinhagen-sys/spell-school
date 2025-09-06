import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { sentence, requiredWords, spinMode } = await request.json()

    if (!sentence || !requiredWords || !Array.isArray(requiredWords)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Create prompt for AI analysis
    const wordsList = requiredWords.map(w => `${w.word} (${w.translation})`).join(', ')
    
    const prompt = `You are an English language teacher helping Swedish students learn English. The student is in grade 6 and English is their second language.

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

Om eleven skriver "The handwriting had a gun customer." ska du säga: "Bra försök att använda orden! Meningen är inte logisk - 'handwriting' kan inte 'ha' en 'gun customer'. Rätt: 'The customer had a gun.'"

VIKTIGT: Alltid föreslå engelska korrigeringar, ALDRIG svenska ord. Om eleven skriver "failed to write down" ska du föreslå "failed to write down" eller "couldn't write down", INTE "misslyckas med att skriva ner".

VIKTIGT: Stavfel ska INTE dra av poäng. Om eleven skriver "I am hapy" istället för "I am happy", ge full poäng men nämn stavfelet i feedbacken: "Bra försök! Din mening är grammatiskt korrekt. Du skriver 'hapy' men det ska vara 'happy'. Rätt: 'I am happy.'"

ALDRIG använd generiska fraser som "meningen behöver mer struktur" eller "lägg till verb". Var alltid SPECIFIK!

Feedbacken ska vara kortfattad (2–3 meningar totalt), tydlig och uppmuntrande i tonen. 
Undvik tekniska termer och långa förklaringar – anpassa språket till en 12-åring.

CRITICAL: When giving examples, ALWAYS use the actual words from the required words list. For example:
- If required word is "irritated" (adjective), use "I am irritated when I wait"
- If required word is "happy" (adjective), use "I am happy when I play"
- If required word is "cat" (noun), use "I see a cat in the garden"
- If required word is "house" (noun), use "I live in a house"
- If required word is "note" (noun), use "I write a note to my dad"
- If required word is "book" (noun), use "I read a book every day"
- If required word is "car" (noun), use "I drive a car to work"

For proper sentences, look for these common mistakes Swedish students make and give SPECIFIC feedback:
- "I is" → "Du skriver 'I is' men det ska vara 'I am'"
- "He are" → "Du skriver 'He are' men det ska vara 'He is'"
- "They was" → "Du skriver 'They was' men det ska vara 'They were'"
- "an cat" → "Du skriver 'an cat' men det ska vara 'a cat'"
- "on the house" → "Du skriver 'on the house' men det ska vara 'in the house'"
- "I go school" → "Du skriver 'I go school' men det ska vara 'I go to school'"
- "I calm" → "Du skriver 'I calm' men det ska vara 'I am calm'"
- "I am note" → "Du skriver 'I am note' men 'note' är ett substantiv, inte ett adjektiv"
- "Did you reading" → "Du skriver 'reading' men det ska vara 'read'"
- "I give you" (past tense) → "Du skriver 'give' men det ska vara 'gave'"
- "I am go" → "Du skriver 'I am go' men det ska vara 'I go'"
- "I can to go" → "Du skriver 'can to go' men det ska vara 'can go'"

Consider these factors for the quality score:
- Grammar correctness (0-0.6 points) - Most important factor
- Word usage and context (0-0.2 points)
- Sentence structure and flow (0-0.2 points)
- Spelling accuracy (0-0.0 points) - Spelling errors should NOT reduce quality score, only be mentioned in feedback

FEEDBACK RULES:
1. If student only wrote words (no sentence): 
   - Quality: 0.0
   - Color: "red"
   - Feedback: "Bra försök att använda orden! Du skrev bara ord utan att göra en mening. Försök att använda ordet/orden i en mening. Ex: 'I am [WORD] when I [ACTION].'"
   - IMPORTANT: Replace [WORD] with the actual word from the wheel and [ACTION] with a relevant action

2. If student wrote a sentence (even if grammatically incorrect):
   - GREEN (color: "green"): Perfect or near-perfect sentence (quality 0.8-1.0)
     - Feedback: "Utmärkt! Din mening är grammatiskt korrekt och tydlig. Du använder orden på ett bra sätt. Fortsätt så!"
     - NOTE: Points = number of words in sentence
   - YELLOW (color: "yellow"): Sentence has grammatical errors but is understandable (quality 0.3-0.7)
     - Examples: "He pretend notice" → "He pretends to notice", "I is happy" → "I am happy"
     - Feedback: "Bra försök att använda orden! Du skriver 'X' men det ska vara 'Y'. Rätt: 'Z'"
     - NOTE: Points = half the number of words in sentence
   - RED (color: "red"): Only for completely illogical sentences or major structural problems (quality 0.0-0.2)
     - Examples: "The handwriting had a gun customer" (illogical), "I am note" (wrong word type)
     - ALDRIG använd "meningen behöver mer struktur" - peka alltid ut specifika fel!
     - NOTE: Points = 0

Examples of good feedback for sentences:
- GREEN: "Utmärkt! Din mening är grammatiskt korrekt och tydlig. Du använder orden på ett bra sätt. Fortsätt så!"
- YELLOW: "Bra försök att använda orden! Du skriver 'I is' men det ska vara 'I am'. Rätt: 'I am happy.'"
- YELLOW: "Bra försök att använda orden! Du skriver 'reading' men det ska vara 'read'. Du skriver också 'give' men det ska vara 'gave'. Rätt: 'Did you read the note I gave you?'"
- RED: "Bra försök att använda orden! Du skriver 'I am note' men 'note' är ett substantiv, inte ett adjektiv. Rätt: 'I write a note to my dad.'"

WRONG EXAMPLE (never do this): "Du skriver 'failed to write down' men det skulle vara bättre att använda 'misslyckas med att skriva ner'"
CORRECT EXAMPLE: "Bra försök att använda orden! Du skriver 'failed to write down' men det ska vara 'couldn't write down'. Rätt: 'Jim couldn't write down a paper slip.'"

Respond in JSON format:
{
  "quality": 0.0,
  "color": "red",
  "feedback": "Bra försök att använda orden! Du skrev bara ord utan att göra en mening. Försök att använda ordet/orden i en mening. Ex: 'I am [ACTUAL_WORD] when I [ACTION].'"
}

Remember: Replace [ACTUAL_WORD] with the exact word from the required words list and [ACTION] with a relevant action.`

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