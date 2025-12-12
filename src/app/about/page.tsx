'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function AboutPage() {
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
            <p className="text-xl text-gray-400">About Us</p>
          </div>

          {/* Mission */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Our Vision
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-4">
              Spell School is an educational tool designed to make vocabulary learning engaging and effective. 
              We believe that learning should be fun, interactive, and adapted to each student's needs.
            </p>
            <p className="text-lg text-gray-300 leading-relaxed">
              By combining gamification, AI technology, and educational research, we create a platform where 
              students want to learn and teachers can easily track progress.
            </p>
          </section>

          {/* What we offer */}
          <section>
            <h2 className="text-3xl font-bold mb-8">What We Offer</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Interactive Games",
                  description: "Multiple game types that make vocabulary learning fun and varied."
                },
                {
                  title: "AI-Powered Feedback",
                  description: "Automatic pronunciation correction and constructive feedback for every student."
                },
                {
                  title: "Progress Tracking",
                  description: "Detailed statistics and insights into each student's development."
                },
                {
                  title: "Flexible Structure",
                  description: "Color block organization and session mode for customized learning."
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Contact Us</h2>
            <p className="text-gray-400 mb-6">
              Have questions or feedback? We'd love to hear from you!
            </p>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              View FAQ
            </Link>
          </section>
        </motion.div>
      </div>
    </div>
  )
}
