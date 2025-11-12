import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

type Item = { prompt: string; expected: string; given: string }

export async function POST(req: Request) {
  try {
    const { items, sourceLanguage, targetLanguage } = (await req.json()) as {
      items: Item[]
      sourceLanguage?: string
      targetLanguage?: string
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 })
    }

    const openai = getOpenAI()
    const system = `Du är en språklärare som rättar svenska/engelska översättningar.

Bedömningsprinciper (fokusera på meningsinnehåll och lärande, var snäll mot stavfel):

VIKTIGT - Börja alltid med att kontrollera om svaret är EXAKT korrekt:
- Om "given" är EXAKT samma som "expected" (case-insensitive, whitespace-trimmed), ge ALLTID 2 poäng. Detta är PRIORITET #1.

- 2 poäng: Exakt rätt ELLER en naturlig synonym/omskrivning med samma betydelse i kontext. Godkänn:
  - Exakt matchning (case-insensitive, whitespace-trimmed): "körde" → "drove" = 2 poäng
  - Tydliga synonymer/parafraser (t.ex. "försäkra sig om" ↔ "förvissa sig om", "make sure" ↔ "ensure").
  - Svensk fras ↔ sammansättning (t.ex. "förändring av klimatet" ↔ "klimatförändring").
  - Ordklass-/formvariation som inte ändrar kärninnebörden (reflexiv/partikelverb, plural/singular, best./obest. form, enkel tempusvariation) om meningen är densamma.
- 1 poäng: Förståeligt svar där betydelsen är tydlig trots stavfel eller mindre formfel. Var EXTRA snäll här:
  - Stavfel som inte förändrar ljudbilden avsevärt (t.ex. "house" → "hous", "cat" → "kat")
  - Stavfel som följer fonetiska regler (t.ex. "night" → "nite", "light" → "lite", "rage" → "reage")
  - Stavfel som en engelskspråkig person skulle förstå i kontext
  - Mindre formfel som inte påverkar kärnbetydelsen
  - Dyslexi-vänliga stavningar som visar att eleven förstår ordet
  - Stavfel som visar att eleven förstår ordets ljudbild (t.ex. "reage" för "rage")
  - Synonymer som är förståeliga men inte exakt samma ord (t.ex. "believe" för "think", "travel" för "journey")
- 0 poäng: Betydelsen stämmer inte alls eller är helt otydlig.

Striktess för mycket korta enstaka ord (behåll strikt):
- Om det förväntade svaret är ETT ord med längd ≤ 3 tecken (t.ex. "hej", "en", "hi"), ge 0 poäng om svaret inte är exakt samma ord. Ge inte 1 poäng för nära stavningar (t.ex. "he" när det rätta är "hi").

Exempel att bedöma som 2 poäng:
- prompt: "körde"; expected: "drove"; given: "drove" → 2 p. (EXAKT matchning)
- prompt: "house"; expected: "hus"; given: "hus" → 2 p. (EXAKT matchning)
- prompt: "make sure"; expected: "förvissa sig om"; given: "försäkra sig om" → 2 p. (synonym)
- prompt: "change in the climate"; expected: "förändring av klimatet"; given: "klimatförändring" → 2 p. (sammansättning)

Exempel att bedöma som 1 poäng (snäll stavningsvalidering):
- prompt: "house"; expected: "hus"; given: "hous" → 1 p. (stavfel men förståeligt)
- prompt: "night"; expected: "natt"; given: "nite" → 1 p. (fonetisk stavning)
- prompt: "cat"; expected: "katt"; given: "kat" → 1 p. (enkel stavfel)
- prompt: "beautiful"; expected: "vacker"; given: "beutiful" → 1 p. (dyslexi-vänlig stavning)
- prompt: "running"; expected: "springer"; given: "runing" → 1 p. (dubbel konsonant missad)
- prompt: "ilska"; expected: "rage"; given: "reage" → 1 p. (fonetisk stavning, förståeligt)
- prompt: "springa"; expected: "run"; given: "runn" → 1 p. (stavfel men nära)
- prompt: "tro"; expected: "think"; given: "believe" → 1 p. (förståeligt synonym men inte exakt)
- prompt: "resa"; expected: "journey"; given: "travel" → 1 p. (förståeligt synonym men inte exakt)

Acceptera följande tydliga synonympar som 2 poäng (om kontexten inte kräver annan nyans):
- "enorm" ↔ "jättestor"
- "slå" ↔ "slå mot" ↔ "smälla mot" (samma handling att träffa/slå till, ej artig fras utan fysisk handling)
// Lägg gärna till liknande par när betydelsen är i praktiken identisk i skolsammanhang.

Tonalitet i feedback:
- Skriv "explanation_sv" BARA för 2-poäng svar (perfekta svar). För 1 och 0 poäng, lämna explanation_sv tomt eller använd enkla meddelanden.
- För 2 poäng: Skriv elevvänligt, tydligt och peppigt (max 1–2 meningar). Uppmuntra perfekta svar.
- För 1 poäng: Lämna explanation_sv tomt eller använd enkelt meddelande som "Bra försök!"
- För 0 poäng: Lämna explanation_sv tomt eller använd enkelt meddelande som "Försök igen!"
- VIKTIGT: Tänk på KONTEXT och flera betydelser av ord. Ett ord kan ha flera betydelser:
  - "Tall" = trädet (pine tree) ELLER "hög" (high) - tänk på sammanhanget!
  - "Pine" = furu (fir tree) ELLER "längta" (to pine) - tänk på sammanhanget!

Utdata: Strikt JSON-array. Varje objekt ska vara { prompt, expected, given, points, reason, explanation_sv, category, verdict }.
- points ∈ {0,1,2}
- reason: kort neutral motivering
- explanation_sv: kort, peppig förklaring på svenska (1–2 meningar) varför det blev 2/1/0 poäng.
- category: "perfect" | "almost_there" | "good_try" | "remaining"
  - "perfect": Exakt rätt eller perfekt synonym (2 poäng)
  - "almost_there": Förståeligt men stavfel/formfel (1 poäng) 
  - "good_try": Försök gjort men fel (0 poäng)
  - "remaining": Tomt svar eller helt otydligt (0 poäng)
- verdict: "correct" | "partial" | "wrong" | "empty"
  - "correct": Rätt svar (2 poäng)
  - "partial": Delvis rätt/förståeligt (1 poäng)
  - "wrong": Fel svar men försök gjort (0 poäng)
  - "empty": Tomt svar (0 poäng)`

    const userContent = JSON.stringify({
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage: targetLanguage || 'auto',
      items,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
    })

    const text = completion.choices[0]?.message?.content?.trim() || '[]'
    let parsed: Array<{ 
      prompt: string; 
      expected: string; 
      given: string; 
      points: 0 | 1 | 2; 
      reason?: string; 
      explanation_sv?: string;
      category?: 'perfect' | 'almost_there' | 'good_try' | 'remaining';
      verdict?: 'correct' | 'partial' | 'wrong' | 'empty';
    }>
    try {
      parsed = JSON.parse(text)
    } catch {
      // Try to extract JSON if model added extra text
      const match = text.match(/\[([\s\S]*)\]/)
      parsed = match ? JSON.parse(match[0]) : []
    }
    // Clamp points and align with input order when possible
    const byKey = new Map(parsed.map(r => [`${r.prompt}||${r.given}||${r.expected}`, r]))
    const results = items.map(it => {
      const key = `${it.prompt}||${it.given}||${it.expected}`
      const r = byKey.get(key)
      
      // SAFETY CHECK: If given answer exactly matches expected (case-insensitive, trimmed), ALWAYS give 2 points
      const givenNormalized = (it.given || '').trim().toLowerCase()
      const expectedNormalized = (it.expected || '').trim().toLowerCase()
      const isExactMatch = givenNormalized === expectedNormalized && givenNormalized.length > 0
      
      let pts = r?.points ?? 0
      if (isExactMatch && pts < 2) {
        // Override AI's scoring if it incorrectly gave less than 2 points for exact match
        pts = 2
        console.log(`⚠️ Auto-corrected: "${it.given}" → "${it.expected}" should be 2 points (was ${r?.points ?? 0})`)
      }
      
      const category = isExactMatch ? 'perfect' : (r?.category || (pts === 2 ? 'perfect' : pts === 1 ? 'almost_there' : 'good_try'))
      const verdict = isExactMatch ? 'correct' : (r?.verdict || (pts === 2 ? 'correct' : pts === 1 ? 'partial' : 'wrong'))
      
      return { 
        ...it, 
        points: pts < 0 ? 0 : pts > 2 ? 2 : pts, 
        reason: isExactMatch ? 'Exakt korrekt svar' : r?.reason, 
        explanation_sv: isExactMatch ? 'Perfekt! Du fick det helt rätt!' : r?.explanation_sv,
        category,
        verdict
      }
    })

    const total = results.reduce((s, r) => s + (r.points as number), 0)
    return NextResponse.json({ total, results })
  } catch (e) {
    return NextResponse.json({ error: 'grading_failed', details: (e as Error).message }, { status: 500 })
  }
}


