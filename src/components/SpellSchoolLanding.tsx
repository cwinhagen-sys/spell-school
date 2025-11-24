'use client'

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, BookOpen, Users, Gamepad2, BarChart3, Sparkles, CheckCircle2, ChevronDown, Trophy, Mic } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Spell School
              </div>
            </Link>


            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-gray-700 hover:text-teal-600 font-medium transition-colors"
              >
                Logga in
              </button>
              <Link
                href="/signup/teacher"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-teal-700 hover:to-emerald-700 transition-all shadow-sm"
              >
                Skapa lärarkonto
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
              className="text-xl md:text-2xl text-teal-600 font-semibold mb-4"
            >
              Det är gratis.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-600 mb-8"
            >
              Låt dina elever öva glosor på engagerande och roliga sätt genom att samla poäng, tjäna troféer och klättra i rank allt eftersom de blir mästare på orden du tilldelar. 
              Med interaktiva övningar, direkt feedback på uttal och tydlig progression får både du och dina elever bättre koll på framstegen.
            </motion.p>
        <motion.div
              initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/signup/teacher"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-center"
              >
                Skapa lärarkonto gratis
              </Link>
              <Link
                href="/session/join"
                className="bg-white border-2 border-teal-600 text-teal-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl text-center"
              >
                Gå med i session
              </Link>
            </motion.div>
          </div>

          {/* Right Column - Wizard Images Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex items-center justify-center min-h-[500px]"
          >
            <div className="relative w-full max-w-2xl">
              {/* Wizard Novice - Top left, tilted left */}
              <motion.div
                initial={{ opacity: 0, rotate: -20, scale: 0.8 }}
                animate={{ opacity: 1, rotate: -12, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="absolute left-0 top-0 z-10"
                style={{ transform: 'translate(-8px, -5px)' }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-teal-200 bg-white p-2 transform hover:scale-105 transition-transform duration-300">
                  <img
                    src="/assets/wizard/wizard_novice.png"
                    alt="Wizard Novice"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </motion.div>

              {/* Wizard Torch - Top right, tilted right */}
              <motion.div
                initial={{ opacity: 0, rotate: 20, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 15, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="absolute right-0 top-0 z-20"
                style={{ transform: 'translate(8px, -8px)' }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-orange-200 bg-white p-2 transform hover:scale-105 transition-transform duration-300">
                  <img
                    src="/assets/wizard/wizard_torch.png"
                    alt="Wizard Torch"
                    className="w-52 h-52 object-contain"
                  />
                </div>
              </motion.div>

              {/* Wizard Energy - Bottom left, tilted right */}
              <motion.div
                initial={{ opacity: 0, rotate: 18, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 10, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute left-0 bottom-0 z-30"
                style={{ transform: 'translate(-5px, 10px)' }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-yellow-200 bg-white p-2 transform hover:scale-105 transition-transform duration-300">
                  <img
                    src="/assets/wizard/wizard_energy.png"
                    alt="Wizard Energy"
                    className="w-52 h-52 object-contain"
                  />
                </div>
              </motion.div>

              {/* Wizard Staff - Bottom right, tilted left */}
              <motion.div
                initial={{ opacity: 0, rotate: -18, scale: 0.8 }}
                animate={{ opacity: 1, rotate: -10, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute right-0 bottom-0 z-40"
                style={{ transform: 'translate(10px, 8px)' }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-200 bg-white p-2 transform hover:scale-105 transition-transform duration-300">
                  <img
                    src="/assets/wizard/wizard_staff.png"
                    alt="Wizard Staff"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              </motion.div>

              {/* Decorative background elements */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-96 h-96 bg-gradient-to-br from-teal-100 via-orange-50 to-emerald-100 rounded-full blur-3xl opacity-30"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="bg-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Så här fungerar Spell School
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Ett enkelt och effektivt system för att organisera och öva glosor
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Feature 1: Poängsystem & Ranking */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100"
            >
              <div className="bg-teal-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Poäng & Ranking</h3>
              <p className="text-gray-600">
                Elever samlar poäng, tjäna troféer och klättrar i rank allt eftersom de blir mästare på orden. 
                Ett motiverande system som gör inlärningen rolig och engagerande.
              </p>
            </motion.div>

            {/* Feature 2: Interaktiva övningar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100"
            >
              <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Interaktiva övningar</h3>
              <p className="text-gray-600">
                Träna uttal och få direkt feedback med automatisk bedömning. 
                Skapa kontext kring ord genom anpassningsbara övningar som anpassar sig efter elevernas behov.
              </p>
            </motion.div>

            {/* Feature 3: Färgblocksindelning */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
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
                Dela in långa gloslistor i färgkodade block. Varje elev väljer själv hur många block de vill öva på för personlig inlärning i egen takt.
              </p>
            </motion.div>

            {/* Feature 4: Session Mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100"
            >
              <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Session Mode</h3>
              <p className="text-gray-600">
                Ge läxor i session mode där du bygger upp en kedja av övningar som eleverna gör i följd. 
                Följ deras progression under hela läxveckan.
              </p>
            </motion.div>
          </div>

          {/* Detailed Feature Sections */}
          <div className="space-y-6">
            {/* Färgblocksindelning - Detaljerad förklaring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Färgblocksindelning för personlig inlärning</h3>
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed">
                        <strong className="text-blue-700">Dela upp långa gloslistor:</strong> Organisera ord i färgkodade block för tematisk eller svårighetsbaserad indelning. Varje block har sin egen färg som gör det visuellt tydligt vilka ord som hör ihop.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-blue-700">Elever väljer själva:</strong> Varje elev har möjlighet att välja hur många block de vill öva på. Detta ger dem kontroll över sin inlärning och möjliggör fokuserad träning på områden där de behöver mer övning.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-blue-700">Flexibel övning:</strong> Perfekt för både strukturerad undervisning där läraren organiserar ord i block och självständig träning där elever väljer sina egna kombinationer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Session Mode - Detaljerad förklaring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8 border-2 border-orange-200"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                      <Gamepad2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Session Mode - Läxor som kedja av övningar</h3>
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed">
                        <strong className="text-orange-700">Bygg upp en kedja av övningar:</strong> Ge läxor i session mode där du enkelt och smidigt bygger upp en kedja av övningar som eleverna måste göra i följd. Varje övning låser upp nästa när den är klar.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-orange-700">Följ progression under läxveckan:</strong> Se hur dina elever framstår genom hela läxveckan med tydlig översikt över vilka övningar som är klara och vilka som återstår.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-orange-700">Avsluta med quiz:</strong> Välj själv om du vill avsluta sessionen med självrättande quiz eller manuellt rättade quiz i ett enkelt poängsystem.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Interaktiva övningar & Feedback - Detaljerad förklaring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border-2 border-purple-200"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Interaktiva övningar med direkt feedback</h3>
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed">
                        <strong className="text-purple-700">Träna uttal och få direkt feedback:</strong> Elever får omedelbar feedback på sitt uttal med automatisk bedömning. Systemet analyserar uttalet och ger konstruktiv feedback för att förbättra pronunciation.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-purple-700">Skapa kontext kring ord:</strong> Använd interaktiva övningar för att skapa kontext kring de ord du tilldelar. Systemet genererar meningar och exempel som hjälper elever att förstå ordets betydelse och användning.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-purple-700">Direkt rättning av quiz:</strong> Ge möjlighet till direkt rättning av quiz med automatisk bedömning eller välj manuell rättning där du har full kontroll över poängsättningen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Progression Tracking - Detaljerad förklaring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Tydlig koll på elevernas framsteg</h3>
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed">
                        <strong className="text-green-700">Accuracy score över tid:</strong> Få tydlig koll på hur det går för dina elever med accuracy score över tid på både övningar och gloslistor. Se trender och identifiera områden som behöver extra stöd.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-green-700">Detaljerad statistik:</strong> Följ elevernas framsteg med omfattande statistik över poäng, antal övningar, tid spenderad och förbättring över tid. Allt på ett och samma ställe.
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-green-700">Progression per gloslista:</strong> Se exakt hur elever presterar på varje gloslista du tilldelar, med tydlig översikt över vilka ord som behöver mer övning.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
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
                  Lära sig ord genom att vända kort och öva uttal med automatisk bedömning
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
      <section className="bg-gradient-to-br from-teal-50 to-emerald-50 py-16 lg:py-24">
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
      <section className="bg-gradient-to-r from-teal-600 to-emerald-700 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Redo att börja?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Skapa ditt konto idag och börja tilldela glosor till dina elever.
          </p>
          <Link
            href="/signup/teacher"
            className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all shadow-lg"
          >
            Skapa lärarkonto gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Spell School</h3>
              <p className="text-sm">
                Ett pedagogiskt verktyg för glosinlärning som gör språkinlärning roligt och engagerande.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Funktioner</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => {
                      const featuresSection = document.getElementById('features-section')
                      if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    className="hover:text-white transition-colors text-left"
                  >
                    Se alla funktioner
                  </button>
                </li>
              </ul>
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
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
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
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-teal-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Loggar in...' : 'Logga in'}
        {!loading && <ArrowRight className="h-4 w-4"/>}
      </button>

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-600">
        Har du inget konto?{' '}
        <Link className="font-medium text-teal-600 hover:text-teal-700 underline" href="/signup/teacher">
          Skapa lärarkonto
        </Link>
      </p>
    </form>
  );
}
