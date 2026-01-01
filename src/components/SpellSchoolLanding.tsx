'use client'

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, ArrowRight, Sparkles, CheckCircle2, Trophy, Mic, X, Play, 
  Zap, Target, ChevronDown, Menu, GraduationCap, BarChart3, Users, 
  BookOpen, Clock, Shield, Star
} from "lucide-react";
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

// Subtle floating particles for premium feel
function SubtleParticles() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-amber-400/40 rounded-full"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            top: `${15 + (i * 11) % 70}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Dropdown menu component
interface DropdownProps {
  label: string;
  items: { label: string; description?: string; icon?: React.ElementType; href?: string; onClick?: () => void }[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function Dropdown({ label, items, isOpen, onToggle, onClose }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium py-2"
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 bg-[#12122a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          >
            <div className="p-2">
              {items.map((item, index) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    {Icon && (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-colors">
                        <Icon className="w-5 h-5 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <span className="text-white font-medium block">{item.label}</span>
                      {item.description && (
                        <span className="text-gray-500 text-sm">{item.description}</span>
                      )}
                    </div>
                  </div>
                );
                
                if (item.href) {
                  return (
                    <Link key={index} href={item.href} onClick={onClose}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={index} onClick={() => { item.onClick?.(); onClose(); }}>
                    {content}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Stats counter animation
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{count.toLocaleString()}{suffix}</span>;
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
  const [featuresOpen, setFeaturesOpen] = useState(false);

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

  const featuresItems = [
    { label: "Interactive Games", description: "10+ engaging vocabulary games", icon: Sparkles, onClick: scrollToFeatures },
    { label: "Pronunciation Training", description: "AI-powered feedback", icon: Mic, onClick: scrollToFeatures },
    { label: "Progress Tracking", description: "Real-time analytics", icon: BarChart3, onClick: scrollToFeatures },
    { label: "Session Mode", description: "Structured homework chains", icon: Clock, onClick: scrollToFeatures },
  ];

  return (
    <div className="min-h-screen bg-[#08080f] text-white overflow-x-hidden">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#0a0a12]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20' 
            : 'bg-[#08080f]/80 backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform shadow-lg shadow-orange-500/20">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col">
                <span 
                  className="text-xl font-bold tracking-tight font-[family-name:var(--font-playfair)]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  <span className="text-white">Spell</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">For Educators</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              <Dropdown 
                label="Features" 
                items={featuresItems} 
                isOpen={featuresOpen} 
                onToggle={() => { setFeaturesOpen(!featuresOpen); }}
                onClose={() => setFeaturesOpen(false)}
              />
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                About
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                FAQ
              </Link>
              
              <div className="w-px h-6 bg-white/10 mx-2" />
              
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Sign in
              </button>
              <Link
                href="/signup/teacher"
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur opacity-50 group-hover:opacity-80 transition-opacity" />
                <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-block hover:from-amber-400 hover:to-orange-500 transition-all">
                  Sign up
                </span>
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2 text-gray-400 hover:text-white"
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
              className="lg:hidden bg-[#0a0a1a]/98 backdrop-blur-xl border-t border-white/5"
            >
              <div className="px-4 py-6 space-y-4">
                <button onClick={() => { scrollToFeatures(); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-300 hover:text-white py-2 font-medium">Features</button>
                <Link href="/about" className="block text-gray-300 hover:text-white py-2 font-medium">About</Link>
                <Link href="/faq" className="block text-gray-300 hover:text-white py-2 font-medium">FAQ</Link>
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <button onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-300 hover:text-white py-2 font-medium">Sign in</button>
                  <Link href="/signup/teacher" className="block bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-3 rounded-xl font-semibold text-center">
                    Sign up
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section - Teacher focused */}
      <section className="relative min-h-screen flex items-center pt-20">
        <SubtleParticles />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column - Main content */}
            <div className="lg:col-span-7 text-center lg:text-left relative z-10">

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6"
              >
                Empower your students to
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500">
                  master vocabulary
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-xl text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                The complete vocabulary platform for teachers. Create engaging exercises, 
                track real-time progress, and watch your students thrive.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
              >
                <Link
                  href="/signup/teacher"
                  className="group relative inline-flex items-center justify-center"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg inline-flex items-center gap-2 hover:from-amber-400 hover:to-orange-500 transition-all">
                    Sign up
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                
                <button
                  onClick={scrollToFeatures}
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
                >
                  See Features
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="grid grid-cols-3 gap-8 max-w-md mx-auto lg:mx-0"
              >
                {[
                  { value: 10, suffix: "+", label: "Game Types" },
                  { value: 50000, suffix: "+", label: "Words Practiced" },
                  { value: 98, suffix: "%", label: "Satisfaction" },
                ].map((stat, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Column - Single wizard with platform preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="lg:col-span-5 relative hidden lg:block"
            >
              {/* Platform preview mockup */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/20 via-purple-500/10 to-cyan-500/20 rounded-3xl blur-2xl" />
                
                {/* Browser mockup */}
                <div className="relative bg-[#12122a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                  {/* Browser header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a1a] border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white/5 rounded-lg px-4 py-1.5 text-xs text-gray-500">
                        spellschool.se/teacher/dashboard
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard preview */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400">Welcome back</div>
                        <div className="text-xl font-bold">Teacher Dashboard</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Active Students", value: "24", icon: Users, color: "from-blue-500 to-cyan-500" },
                        { label: "Words This Week", value: "1,240", icon: BookOpen, color: "from-emerald-500 to-teal-500" },
                      ].map((card, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-2`}>
                            <card.icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-lg font-bold">{card.value}</div>
                          <div className="text-xs text-gray-500">{card.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Progress bars */}
                    <div className="space-y-2">
                      {[
                        { name: "Class 7A", progress: 85, color: "from-amber-500 to-orange-500" },
                        { name: "Class 8B", progress: 62, color: "from-purple-500 to-pink-500" },
                      ].map((cls, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-300">{cls.name}</span>
                            <span className="text-gray-500">{cls.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full bg-gradient-to-r ${cls.color} rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: `${cls.progress}%` }}
                              transition={{ duration: 1, delay: 0.8 + i * 0.2 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

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
            <span className="text-xs text-gray-500 uppercase tracking-widest">Explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" as const }}
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
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider mb-4 block">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need for
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                effective vocabulary teaching
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A complete platform designed for teachers who want to engage and track student progress
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Trophy,
                title: "Gamified Learning",
                description: "Students earn XP, unlock achievements, and compete on leaderboards. Motivation built in.",
                gradient: "from-amber-500 to-orange-500",
                delay: 0
              },
              {
                icon: Mic,
                title: "AI Pronunciation",
                description: "Instant AI feedback on pronunciation helps students perfect their speaking skills.",
                gradient: "from-purple-500 to-pink-500",
                delay: 0.1
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description: "Track individual and class progress with detailed insights and reports.",
                gradient: "from-cyan-500 to-blue-500",
                delay: 0.2
              },
              {
                icon: Zap,
                title: "Session Chains",
                description: "Create structured homework sequences. Students unlock exercises step by step.",
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
                <span className="text-sm text-purple-300">AI-Powered Feedback</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Instant feedback on
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500"> pronunciation</span>
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Students receive immediate, constructive feedback on their pronunciation through 
                advanced AI analysis. No more waiting for teacher corrections.
              </p>
              <ul className="space-y-4">
                {["Real-time pronunciation analysis", "Detailed accuracy scores", "Practice until perfect"].map((item, i) => (
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
                    <p className="text-gray-400">Tap to record</p>
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
                <div className="space-y-4">
                  {["Flashcards", "Memory Game", "Typing Practice", "Final Quiz"].map((step, i) => (
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
                      {i === 2 && <span className="text-amber-400 text-sm animate-pulse">In Progress</span>}
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
                Structured
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500"> homework chains</span>
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Design exercise sequences that students complete in order. Perfect for 
                homework assignments where you want to ensure comprehensive practice.
              </p>
              <ul className="space-y-4">
                {["Progressive exercise unlocking", "Real-time progress monitoring", "Automatic grading"].map((item, i) => (
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

      {/* Benefits Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why teachers choose
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"> Spell School</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Clock, text: "Quick setup - ready in 5 minutes" },
              { icon: Target, text: "10+ interactive game types" },
              { icon: BarChart3, text: "Automatic progress tracking" },
              { icon: Trophy, text: "Motivating gamification" },
              { icon: Shield, text: "GDPR compliant & secure" },
              { icon: Sparkles, text: "Works on all devices" }
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 hover:border-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-200 font-medium">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - No wizard image */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", repeatType: "loop" as const }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Ready to transform your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500">
                vocabulary teaching?
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join hundreds of teachers who are already making vocabulary learning engaging and effective.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup/teacher"
                className="group relative inline-flex items-center justify-center"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-10 py-4 rounded-2xl font-bold text-lg inline-flex items-center gap-3 hover:from-amber-400 hover:to-orange-500 transition-all">
                  Sign up now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center gap-2 text-gray-400 hover:text-white px-6 py-4 rounded-2xl font-medium transition-colors"
              >
                Have questions? Read FAQ
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Clean without image */}
      <footer className="relative border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
                  <span className="text-white">Spell</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
                </span>
              </Link>
              <p className="text-gray-500 max-w-sm mb-6">
                The complete vocabulary platform designed for teachers who want to engage and inspire their students.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>GDPR Compliant</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><button onClick={scrollToFeatures} className="text-gray-400 hover:text-white transition-colors">Features</button></li>
                <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Spell School. All rights reserved.</p>
            <Link 
              href="/session/join" 
              className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
            >
              Student? Join a session →
            </Link>
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
                  <h2 className="text-2xl font-bold">Sign in</h2>
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
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-gray-900 px-4 py-3.5 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5"/>
        Continue with Google
      </button>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#12122a] text-gray-500">or</span>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-2 block">Email or username</span>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
          <input
            required
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier?.(e.target.value)}
            placeholder="you@school.com"
            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-2 block">Password</span>
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

      {message && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'Signing in...' : 'Sign in'}
        {!loading && <ArrowRight className="h-5 w-5"/>}
      </button>

      <p className="text-center text-sm text-gray-400 pt-2">
        Don't have an account?{' '}
        <Link className="font-medium text-amber-500 hover:text-amber-400" href="/signup/teacher">
          Start free trial
        </Link>
      </p>
    </form>
  );
}
