'use client'

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, BookOpen, Users, Gamepad2, BarChart3, Sparkles, CheckCircle2, ChevronDown } from "lucide-react";
import Link from "next/link";

interface SpellSchoolLandingProps {
  logoUrl?: string;
  posterUrl?: string;
  onEmailLogin?: (e: React.FormEvent<HTMLFormElement>, identifier: string, password: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  loading?: boolean;
  message?: string;
  identifier?: string;
  setIdentifier?: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
}

export default function SpellSchoolLanding({
  logoUrl = "/images/memory-card-back.png",
  posterUrl = "/images/memory-card-back.png",
  onEmailLogin,
  onGoogleLogin,
  loading = false,
  message = "",
  identifier = "",
  setIdentifier,
  password = "",
  setPassword,
}: SpellSchoolLandingProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Spell School
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className="text-gray-700 hover:text-purple-600 transition-colors flex items-center gap-1"
              >
                Funktioner
                <ChevronDown className={`w-4 h-4 transition-transform ${showFeatures ? 'rotate-180' : ''}`} />
              </button>
              <Link href="/privacy" className="text-gray-700 hover:text-purple-600 transition-colors">
                Integritet
              </Link>
              <Link href="/terms" className="text-gray-700 hover:text-purple-600 transition-colors">
                Villkor
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
              >
                Logga in
              </button>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                Skapa konto
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
            >
              Förbättra dina elevers ordförråd
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl md:text-2xl text-purple-600 font-semibold mb-4"
            >
              Det är gratis.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-600 mb-8"
            >
              Tilldela glosor till dina elever och låt dem lära sig genom magiska övningar. 
              Ett pedagogiskt verktyg som gör språkinlärning roligt och engagerande.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/signup"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-center"
              >
                Skapa konto gratis
              </Link>
              <Link
                href="/signup/teacher"
                className="text-purple-600 hover:text-purple-700 font-medium text-lg underline text-center"
              >
                Jag är lärare
              </Link>
            </motion.div>
          </div>

          {/* Right Column - Student Signup Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-100">
              <img
                src="/images/student-signup.png"
                alt="Spell School student interface"
                className="w-full h-auto object-cover"
              />
              {/* Fade-out gradient masks on edges */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white pointer-events-none opacity-60"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none opacity-40"></div>
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 pointer-events-none"></div>
            </div>
            {/* Floating decoration elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-200 rounded-full opacity-20 blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-200 rounded-full opacity-20 blur-2xl"></div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Så här fungerar Spell School
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Ett enkelt och effektivt system för att organisera och öva glosor
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Feature 1: Tilldela glosor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100"
            >
              <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Tilldela glosor</h3>
              <p className="text-gray-600">
                Skapa ordlistor och tilldela dem till klasser eller enskilda elever. Enkelt och snabbt.
              </p>
            </motion.div>

            {/* Feature 2: Färgblocksindelning */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100"
            >
              <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-3 h-3 bg-white rounded"></div>
                  <div className="w-3 h-3 bg-white rounded"></div>
                  <div className="w-3 h-3 bg-white rounded"></div>
                  <div className="w-3 h-3 bg-white rounded"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Färgblocksindelning</h3>
              <p className="text-gray-600">
                Organisera ord i färgkodade block. Elever väljer själva vilka block de vill öva med för personlig inlärning.
              </p>
            </motion.div>

            {/* Feature 3: Magiska övningar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100"
            >
              <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Magiska övningar</h3>
              <p className="text-gray-600">
                Flashcards, memory, typing och fler spel som gör glosinlärning roligt och engagerande.
              </p>
            </motion.div>

            {/* Feature 4: Följ framsteg */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100"
            >
              <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Följ framsteg</h3>
              <p className="text-gray-600">
                Se hur dina elever presterar med detaljerad statistik och framstegsspårning.
              </p>
            </motion.div>
          </div>

          {/* Färgblocksindelning - Detaljerad förklaring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-indigo-200"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                      <div className="w-3 h-3 bg-white rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Varför färgblocksindelning?</h3>
                  <div className="space-y-4 text-gray-700">
                    <p className="leading-relaxed">
                      <strong className="text-indigo-700">Organiserad inlärning:</strong> Lärare delar in ordlistor i färgkodade block, vilket gör det enkelt att organisera ord tematisk eller efter svårighetsgrad. Varje block har sin egen färg som gör det visuellt tydligt.
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-indigo-700">Personlig anpassning:</strong> Elever väljer själva vilka färgblock de vill öva med. Detta ger dem kontroll över sin inlärning och möjliggör fokuserad träning på områden där de behöver mer övning.
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-indigo-700">Visuell tydlighet:</strong> Färgkodningen gör det enkelt att se vilka ord som hör ihop och skapar en visuell struktur som underlättar minnet. Elever kan snabbt identifiera och välja rätt block.
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-indigo-700">Flexibel övning:</strong> Systemet stödjer både lärare som vill organisera ord i block och elever som vill välja sina egna kombinationer. Perfekt för både strukturerad undervisning och självständig träning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Game Screenshots Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Magiska övningar som gör glosinlärning roligt
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Utforska våra interaktiva spel där elever lär sig genom lek och engagemang
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Flashcard Game */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 relative overflow-hidden">
                <img
                  src="/screenshots/flashcards.png"
                  alt="Flashcards spel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback om bilden inte finns
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-purple-600">
                          <div class="text-center">
                            <div class="text-4xl mb-2">🃏</div>
                            <div class="text-sm font-semibold">Flashcards</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Flashcards</h3>
                <p className="text-gray-600 text-sm">
                  Lära sig ord genom att vända kort och öva uttal med AI-baserad bedömning
                </p>
              </div>
            </motion.div>

            {/* Memory Game */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 relative overflow-hidden">
                <img
                  src="/screenshots/memory.png"
                  alt="Memory spel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-blue-600">
                          <div class="text-center">
                            <div class="text-4xl mb-2">🧠</div>
                            <div class="text-sm font-semibold">Memory</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Memory</h3>
                <p className="text-gray-600 text-sm">
                  Matcha ord med sina översättningar i ett klassiskt memory-spel
                </p>
              </div>
            </motion.div>

            {/* Typing Challenge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-orange-100 to-yellow-100 relative overflow-hidden">
                <img
                  src="/screenshots/typing.png"
                  alt="Typing Challenge spel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-orange-600">
                          <div class="text-center">
                            <div class="text-4xl mb-2">⌨️</div>
                            <div class="text-sm font-semibold">Typing Challenge</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Typing Challenge</h3>
                <p className="text-gray-600 text-sm">
                  Öva stavning och snabbhet genom att skriva ord så snabbt som möjligt
                </p>
              </div>
            </motion.div>

            {/* Translate Game */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-100 relative overflow-hidden">
                <img
                  src="/screenshots/translate.png"
                  alt="Translate spel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-green-600">
                          <div class="text-center">
                            <div class="text-4xl mb-2">🌐</div>
                            <div class="text-sm font-semibold">Translate</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Translate</h3>
                <p className="text-gray-600 text-sm">
                  Översätt ord mellan svenska och engelska för att förstå betydelsen
                </p>
              </div>
            </motion.div>

            {/* Sentence Gap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-pink-100 to-rose-100 relative overflow-hidden">
                <img
                  src="/screenshots/sentence-gap.png"
                  alt="Sentence Gap spel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-pink-600">
                          <div class="text-center">
                            <div class="text-4xl mb-2">📝</div>
                            <div class="text-sm font-semibold">Sentence Gap</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sentence Gap</h3>
                <p className="text-gray-600 text-sm">
                  Fyll i luckor i meningar för att lära sig ord i kontext - kontexten visar ordets betydelse
                </p>
              </div>
            </motion.div>

            {/* Word Roulette */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-amber-100 to-yellow-100 relative overflow-hidden">
                <img
                  src="/screenshots/roulette.png"
                  alt="Word Roulette spel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-amber-600">
                          <div class="text-center">
                            <div class="text-4xl mb-2">🎯</div>
                            <div class="text-sm font-semibold">Word Roulette</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Word Roulette</h3>
                <p className="text-gray-600 text-sm">
                  Skapa meningar med slumpade ord för att öva sammanhang och grammatik
                </p>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">
              Och många fler speltyper för varierad träning!
            </p>
          </div>
        </div>
      </section>


      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-purple-50 to-indigo-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Varför välja Spell School?
            </h2>
            <p className="text-lg text-gray-600">
              Ett komplett verktyg för lärare som vill göra glosinlärning roligt och effektivt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              "Enkelt att skapa och tilldela glosor",
              "Flera olika speltyper för varierad träning",
              "Automatisk framstegsspårning och statistik",
              "Motiverande XP-system och nivåer för elever",
              "Gratis att använda",
              "Säker och GDPR-kompatibel"
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start space-x-3 bg-white rounded-lg p-4 shadow-sm"
              >
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 font-medium">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-700 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Redo att börja?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Skapa ditt konto idag och börja tilldela glosor till dina elever.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all shadow-lg"
          >
            Skapa konto gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Spell School</h3>
              <p className="text-sm">
                Ett pedagogiskt verktyg för glosinlärning som gör språkinlärning roligt och engagerande.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Länkar</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Integritetspolicy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Användarvillkor
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">För lärare</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/signup/teacher" className="hover:text-white transition-colors">
                    Skapa lärarkonto
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Spell School. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Logga in</h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
                    <FormContents 
                      onEmailLogin={onEmailLogin}
                      onGoogleLogin={onGoogleLogin}
                      loading={loading}
                      message={message}
                      identifier={identifier}
                      setIdentifier={setIdentifier}
                      password={password}
                      setPassword={setPassword}
                    />
          </motion.div>
                  </div>
      )}
    </div>
  );
}

interface FormContentsProps {
  onEmailLogin?: (e: React.FormEvent<HTMLFormElement>, identifier: string, password: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  loading?: boolean;
  message?: string;
  identifier?: string;
  setIdentifier?: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
}

function FormContents({
  onEmailLogin,
  onGoogleLogin,
  loading = false,
  message = "",
  identifier = "",
  setIdentifier,
  password = "",
  setPassword,
}: FormContentsProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onEmailLogin) {
      await onEmailLogin(e, identifier, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Google CTA */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5"/>
        Fortsätt med Google
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">eller</span>
        </div>
      </div>

      {/* Email/Username */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700 mb-1.5 block">Användarnamn eller e-post</span>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
          <input
            required
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier?.(e.target.value)}
            placeholder="användarnamn eller e-post"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700 mb-1.5 block">Lösenord</span>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword?.(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </label>

      {/* Error message */}
      {message && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Loggar in...' : 'Logga in'}
        {!loading && <ArrowRight className="h-4 w-4"/>}
      </button>

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-600">
        Har du inget konto?{' '}
        <Link className="font-medium text-purple-600 hover:text-purple-700 underline" href="/signup">
          Registrera dig
        </Link>
      </p>
    </form>
  );
}
