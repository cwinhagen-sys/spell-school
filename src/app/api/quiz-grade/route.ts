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

Bedömningsprinciper (fokusera på meningsinnehåll, inte exakt form):
- 2 poäng: Exakt rätt ELLER en naturlig synonym/omskrivning med samma betydelse i kontext. Godkänn:
  - Tydliga synonymer/parafraser (t.ex. "försäkra sig om" ↔ "förvissa sig om", "make sure" ↔ "ensure").
  - Svensk fras ↔ sammansättning (t.ex. "förändring av klimatet" ↔ "klimatförändring").
  - Ordklass-/formvariation som inte ändrar kärninnebörden (reflexiv/partikelverb, plural/singular, best./obest. form, enkel tempusvariation) om meningen är densamma.
- 1 poäng: Nästan rätt – betydelsen uppfattas i stort, men det finns en tydlig brist som gör det mindre naturligt/riktigt (större stavfel, fel ordform som påverkar uttrycket, eller synonym som byter nyans på ett sätt som stör).
- 0 poäng: Betydelsen stämmer inte.

Striktess för mycket korta enstaka ord (behåll strikt):
- Om det förväntade svaret är ETT ord med längd ≤ 3 tecken (t.ex. "hej", "en", "hi"), ge 0 poäng om svaret inte är exakt samma ord. Ge inte 1 poäng för nära stavningar (t.ex. "he" när det rätta är "hi").

Exempel att bedöma som 2 poäng:
- prompt: "make sure"; expected: "förvissa sig om"; given: "försäkra sig om" → 2 p.
- prompt: "change in the climate"; expected: "förändring av klimatet"; given: "klimatförändring" → 2 p.

Acceptera följande tydliga synonympar som 2 poäng (om kontexten inte kräver annan nyans):
- "enorm" ↔ "jättestor"
- "slå" ↔ "slå mot" ↔ "smälla mot" (samma handling att träffa/slå till, ej artig fras utan fysisk handling)
// Lägg gärna till liknande par när betydelsen är i praktiken identisk i skolsammanhang.

Tonalitet i feedback:
- Skriv "explanation_sv" elevvänligt, tydligt och peppigt (max 1–2 meningar). Uppmuntra försök även vid fel (t.ex. "Bra försök – du är nära! ...").
- Förklara skillnaden i betydelse/användning mellan elevens ord och det förväntade, i stället för att säga att det finns ett "mer exakt" ord. Skriv gärna:
  - "'X' betyder … (nyans/register/intensitet), medan 'Y' betyder …; därför passar Y bättre här."
  - Ge en enkel miniexempel eller sammanhang om det hjälper (kort!).
  - Exempel: "'slå' är generellt 'hit', medan 'pound' är 'slå hårt upprepade gånger'; därför är 'pound' bättre här."
  - Exempel: "'vända om' = 'turn around', men 'turn away' betyder 'vända bort'/'avvisa'; därför ändras betydelsen."

Utdata: Strikt JSON-array. Varje objekt ska vara { prompt, expected, given, points, reason, explanation_sv }.
- points ∈ {0,1,2}
- reason: kort neutral motivering
- explanation_sv: kort, peppig förklaring på svenska (1–2 meningar) varför det blev 2/1/0 poäng.`

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
    let parsed: Array<{ prompt: string; expected: string; given: string; points: 0 | 1 | 2; reason?: string; explanation_sv?: string }>
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
      const pts = r?.points ?? 0
      return { ...it, points: pts < 0 ? 0 : pts > 2 ? 2 : pts, reason: r?.reason, explanation_sv: r?.explanation_sv }
    })

    const total = results.reduce((s, r) => s + (r.points as number), 0)
    return NextResponse.json({ total, results })
  } catch (e) {
    return NextResponse.json({ error: 'grading_failed', details: (e as Error).message }, { status: 500 })
  }
}


