'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "Hur skapar jag ett konto?",
    answer: "Klicka på 'Skapa lärarkonto' på startsidan och följ instruktionerna. Du kan använda Google-inloggning eller skapa ett konto med e-post och lösenord."
  },
  {
    question: "Är Spell School gratis?",
    answer: "Spell School erbjuder en gratis plan med grundläggande funktioner. För fler ordlistor och avancerade funktioner finns Premium- och Pro-planer tillgängliga."
  },
  {
    question: "Hur lägger jag till elever?",
    answer: "Efter att du har skapat ett konto kan du gå till 'Lägg till elever' i menyn. Där kan du skapa elevkonton och tilldela dem till klasser."
  },
  {
    question: "Hur skapar jag gloslistor?",
    answer: "Gå till 'Ordlistor' i menyn och klicka på 'Skapa ny ordlista'. Lägg till ord med svenska och engelska översättningar, och välj eventuellt bilder för varje ord."
  },
  {
    question: "Vad är färgblocksindelning?",
    answer: "Färgblocksindelning låter dig dela upp en gloslista i olika färgkodade block. Elever kan välja vilket block de vill öva på, vilket ger dem mer kontroll över sin inlärning."
  },
  {
    question: "Hur fungerar Session Mode?",
    answer: "Session Mode låter dig skapa kedjor av övningar som läxor. Elever måste slutföra övningarna i ordning, vilket säkerställer strukturerad progression."
  },
  {
    question: "Hur fungerar AI-uttalsrättning?",
    answer: "Elever kan spela in sitt uttal av ord, och vårt AI-system analyserar uttalet och ger omedelbar feedback. Detta hjälper elever att förbättra sin pronunciation."
  },
  {
    question: "Kan elever se varandras resultat?",
    answer: "Nej, elever kan endast se sina egna resultat och framsteg. Lärare kan se alla elevers resultat för att följa upp och ge stöd."
  },
  {
    question: "Är Spell School GDPR-kompatibel?",
    answer: "Ja, Spell School följer GDPR-regler och tar dataskydd på allvar. All elevdata hanteras säkert och endast lärare har tillgång till sina elevers information."
  },
  {
    question: "Hur uppgraderar jag min plan?",
    answer: "Gå till 'Konto' i menyn och välj den plan som passar dig. Du kan uppgradera när som helst för att få tillgång till fler funktioner."
  }
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f2a] via-[#0a0a1a] to-[#050510]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px]" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Tillbaka till startsidan</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Logo and Title */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">
                Spell<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
              </h1>
            </div>
            <p className="text-xl text-gray-400">Vanliga frågor</p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-lg pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-gray-300 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Har du fler frågor?</h2>
            <p className="text-gray-400 mb-6">
              Kontakta oss om du behöver mer hjälp eller har feedback.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              Läs mer om oss
            </Link>
          </section>
        </motion.div>
      </div>
    </div>
  )
}




