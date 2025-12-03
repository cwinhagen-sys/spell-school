'use client'

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Sparkles, CheckCircle2, Trophy, Mic, X, Play, Star, Zap, Target, BookOpen, Users, ChevronDown, Menu } from "lucide-react";
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

// Floating magical particles
function MagicParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-amber-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f2a] via-[#0a0a1a] to-[#050510]" />
        
        {/* Magical aurora effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px]" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/15 rounded-full blur-[80px]" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 to-rose-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Spell<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={scrollToFeatures}
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Funktioner
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Logga in
              </button>
              <Link
                href="/signup/teacher"
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-block hover:from-amber-400 hover:to-orange-500 transition-all">
                  Kom igång gratis
                </span>
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-white/5"
            >
              <div className="px-4 py-4 space-y-3">
                <button onClick={scrollToFeatures} className="block w-full text-left text-gray-400 hover:text-white py-2">Funktioner</button>
                <button onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-400 hover:text-white py-2">Logga in</button>
                <Link href="/signup/teacher" className="block bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-3 rounded-xl font-semibold text-center">
                  Kom igång gratis
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <MagicParticles />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Text */}
            <div className="text-center lg:text-left relative z-10">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-8"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm text-gray-300">Ny: Automatisk uttalsrättning med AI</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8"
              >
                Glosor blir
                <br />
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500">
                    magiska
                  </span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 12"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                  >
                    <motion.path
                      d="M2 8 Q50 2, 100 8 T 198 6"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-xl text-gray-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Engagera dina elever med interaktiva spel, poängsystem och AI-driven feedback. 
                Följ deras framsteg i realtid medan de samlar XP och klättrar i rank.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link
                  href="/signup/teacher"
                  className="group relative inline-flex items-center justify-center gap-2"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg inline-flex items-center gap-2 hover:from-amber-400 hover:to-orange-500 transition-all">
                    Skapa lärarkonto
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                
                <Link
                  href="/session/join"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
                >
                  <Play className="w-5 h-5" />
                  Gå med i session
                </Link>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 flex items-center gap-6 justify-center lg:justify-start"
              >
                <div className="flex -space-x-3">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full border-2 border-[#0a0a1a] bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold"
                    >
                      {['A', 'S', 'M', 'K'][i]}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-white font-semibold">500+</span> lärare använder Spell School
                </div>
              </motion.div>
            </div>

            {/* Right Column - Wizard Stack */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative"
            >
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                {/* Glow effect behind wizards */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-purple-500/10 to-cyan-500/20 rounded-full blur-3xl" />
                
                {/* Wizard cards in a floating stack */}
                <motion.div
                  className="absolute left-[5%] top-[5%] w-[45%]"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl p-3 border border-white/10 transform hover:scale-105 transition-transform">
                      <img
                        src="/assets/wizard/wizard_novice.png"
                        alt="Wizard Novice"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute right-[5%] top-[0%] w-[50%]"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl p-3 border border-white/10 transform hover:scale-105 transition-transform">
                      <img
                        src="/assets/wizard/wizard_torch.png"
                        alt="Wizard Torch"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute left-[0%] bottom-[5%] w-[50%]"
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl p-3 border border-white/10 transform hover:scale-105 transition-transform">
                      <img
                        src="/assets/wizard/wizard_energy.png"
                        alt="Wizard Energy"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute right-[0%] bottom-[10%] w-[52%]"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                >
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl p-3 border border-white/10 transform hover:scale-105 transition-transform">
                      <img
                        src="/assets/wizard/wizard_staff.png"
                        alt="Wizard Staff"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider mb-4 block">Funktioner</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Allt du behöver för att göra
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                glosinlärning effektivt
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Ett komplett verktyg designat för lärare som vill engagera sina elever
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Trophy,
                title: "Poäng & Ranking",
                description: "Elever samlar XP, tjänar troféer och klättrar i rank. Gamification som motiverar!",
                gradient: "from-amber-500 to-orange-500",
                delay: 0
              },
              {
                icon: Sparkles,
                title: "Interaktiva Övningar",
                description: "Träna uttal med AI-feedback och skapa kontext kring ord med smarta övningar.",
                gradient: "from-purple-500 to-pink-500",
                delay: 0.1
              },
              {
                icon: Target,
                title: "Färgblocksindelning",
                description: "Dela upp gloslistor i färgkodade block. Elever väljer själva vad de vill öva på.",
                gradient: "from-cyan-500 to-blue-500",
                delay: 0.2
              },
              {
                icon: Zap,
                title: "Session Mode",
                description: "Bygg kedjor av övningar som läxor. Följ progression genom hela veckan.",
                gradient: "from-rose-500 to-red-500",
                delay: 0.3
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay }}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl blur"
                  style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                />
                <div className="relative h-full bg-[#12122a] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          {/* Feature 1 - Pronunciation */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
                <Mic className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">AI-driven uttalsrättning</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Direkt feedback på
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500"> uttal</span>
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Elever får omedelbar feedback på sitt uttal med automatisk AI-bedömning. 
                Systemet analyserar uttalet och ger konstruktiv feedback för att förbättra pronunciation.
              </p>
              <ul className="space-y-4">
                {["Realtidsanalys av uttal", "Konstruktiv feedback på fel", "Träna tills det sitter"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-8">
                <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Mic className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-gray-400">Trycka för att spela in</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 2 - Session Mode */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-orange-500/20 to-rose-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-8">
                {/* Session chain visualization */}
                <div className="space-y-4">
                  {["Flashcards", "Memory", "Typing", "Quiz"].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        i < 2 ? 'bg-emerald-500' : i === 2 ? 'bg-amber-500' : 'bg-gray-700'
                      }`}>
                        {i < 2 ? <CheckCircle2 className="w-5 h-5 text-white" /> : 
                         i === 2 ? <Play className="w-5 h-5 text-white" /> :
                         <Lock className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div className="flex-1 h-12 bg-white/5 rounded-xl flex items-center px-4">
                        <span className={i < 3 ? 'text-white' : 'text-gray-500'}>{step}</span>
                      </div>
                      {i < 2 && <span className="text-emerald-400 text-sm">100%</span>}
                      {i === 2 && <span className="text-amber-400 text-sm animate-pulse">Aktiv</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-6">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-300">Session Mode</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Strukturerade
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500"> läxkedjor</span>
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Bygg upp sekvenser av övningar som elever måste slutföra i ordning. 
                Perfekt för läxor där du vill säkerställa att alla steg genomförs.
              </p>
              <ul className="space-y-4">
                {["Övningar låser upp i sekvens", "Följ progression i realtid", "Avsluta med quiz för bedömning"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Games Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-cyan-500 font-semibold text-sm uppercase tracking-wider mb-4 block">Spel</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Magiska övningar som
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                gör inlärning rolig
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Flashcards", img: "/screenshots/flashcards.png", desc: "Vänd kort och öva uttal med AI-bedömning", color: "from-purple-500 to-indigo-500" },
              { name: "Memory", img: "/screenshots/memory.png", desc: "Matcha ord med sina översättningar", color: "from-cyan-500 to-blue-500" },
              { name: "Typing Challenge", img: "/screenshots/typing.png", desc: "Öva stavning och snabbhet", color: "from-orange-500 to-amber-500" },
              { name: "Translate", img: "/screenshots/translate.png", desc: "Översätt mellan svenska och engelska", color: "from-emerald-500 to-teal-500" },
              { name: "Sentence Gap", img: "/screenshots/sentence-gap.png", desc: "Fyll i luckor för att lära ord i kontext", color: "from-pink-500 to-rose-500" },
              { name: "Word Roulette", img: "/screenshots/roulette.png", desc: "Skapa meningar med slumpade ord", color: "from-amber-500 to-yellow-500" },
            ].map((game, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-50 transition-opacity duration-500 rounded-3xl blur`} />
                <div className="relative bg-[#12122a] border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={game.img}
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-20`} />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                    <p className="text-gray-400 text-sm">{game.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-500 mt-12"
          >
            ...och flera fler speltyper för varierad träning!
          </motion.p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Varför välja
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"> Spell School?</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Enkelt att skapa och tilldela glosor",
              "Flera olika speltyper för varierad träning",
              "Automatisk framstegsspårning och statistik",
              "Motiverande XP-system och nivåer",
              "Säker och GDPR-kompatibel",
              "Snabb setup - börja på 5 minuter"
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 hover:border-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-200 font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-amber-500/20 to-rose-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Redo att börja?
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Skapa ditt gratis lärarkonto idag och börja tilldela glosor till dina elever på några minuter.
            </p>
            <Link
              href="/signup/teacher"
              className="group relative inline-flex items-center justify-center gap-2"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-10 py-5 rounded-2xl font-bold text-xl inline-flex items-center gap-3 hover:from-amber-400 hover:to-orange-500 transition-all">
                Skapa lärarkonto
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold">SpellSchool</span>
              </Link>
              <p className="text-gray-500 max-w-sm">
                Ett pedagogiskt verktyg för glosinlärning som gör språkinlärning roligt och engagerande.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Länkar</h3>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Integritetspolicy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Användarvillkor</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">För lärare</h3>
              <ul className="space-y-3">
                <li><Link href="/signup/teacher" className="text-gray-400 hover:text-white transition-colors">Skapa konto</Link></li>
                <li><button onClick={() => setShowLoginModal(true)} className="text-gray-400 hover:text-white transition-colors">Logga in</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Spell School. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">Logga in</h2>
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-gray-900 px-4 py-3.5 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5"/>
        Fortsätt med Google
      </button>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#12122a] text-gray-500">eller</span>
        </div>
      </div>

      {/* Email/Username */}
      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-2 block">Användarnamn eller e-post</span>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
          <input
            required
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier?.(e.target.value)}
            placeholder="användarnamn eller e-post"
            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-2 block">Lösenord</span>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword?.(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
      </label>

      {/* Error message */}
      {message && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'Loggar in...' : 'Logga in'}
        {!loading && <ArrowRight className="h-5 w-5"/>}
      </button>

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-400 pt-2">
        Har du inget konto?{' '}
        <Link className="font-medium text-amber-500 hover:text-amber-400" href="/signup/teacher">
          Skapa lärarkonto
        </Link>
      </p>
    </form>
  );
}
