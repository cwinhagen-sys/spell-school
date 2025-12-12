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
    question: "How do I create an account?",
    answer: "Click 'Create teacher account' on the homepage and follow the instructions. You can use Google login or create an account with email and password."
  },
  {
    question: "Is Spell School free?",
    answer: "Spell School offers a free plan with basic features. For more word lists and advanced features, Premium and Pro plans are available."
  },
  {
    question: "How do I add students?",
    answer: "After creating an account, go to 'Add Students' in the menu. There you can create student accounts and assign them to classes."
  },
  {
    question: "How do I create word lists?",
    answer: "Go to 'Word Lists' in the menu and click 'Create new word list'. Add words with Swedish and English translations, and optionally choose images for each word."
  },
  {
    question: "What is color block organization?",
    answer: "Color block organization lets you divide a word list into different color-coded blocks. Students can choose which block they want to practice, giving them more control over their learning."
  },
  {
    question: "How does Session Mode work?",
    answer: "Session Mode lets you create chains of exercises as homework. Students must complete the exercises in order, ensuring structured progression."
  },
  {
    question: "How does AI pronunciation feedback work?",
    answer: "Students can record their pronunciation of words, and our AI system analyzes the pronunciation and provides immediate feedback. This helps students improve their speaking skills."
  },
  {
    question: "Can students see each other's results?",
    answer: "No, students can only see their own results and progress. Teachers can see all students' results to follow up and provide support."
  },
  {
    question: "Is Spell School GDPR compliant?",
    answer: "Yes, Spell School follows GDPR regulations and takes data protection seriously. All student data is handled securely and only teachers have access to their students' information."
  },
  {
    question: "How do I upgrade my plan?",
    answer: "Go to 'Account' in the menu and select the plan that suits you. You can upgrade at any time to get access to more features."
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
            <span>Back to home</span>
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
            <p className="text-xl text-gray-400">Frequently Asked Questions</p>
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
            <h2 className="text-2xl font-bold mb-4">Have more questions?</h2>
            <p className="text-gray-400 mb-6">
              Contact us if you need more help or have feedback.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              Learn more about us
            </Link>
          </section>
        </motion.div>
      </div>
    </div>
  )
}
