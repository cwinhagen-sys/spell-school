'use client'

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Sparkles, Zap, Crown, Check, X, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SpellSchoolSignupProps {
  logoUrl?: string;
  posterUrl?: string;
  onGoogleSignup?: () => Promise<void>;
  onEmailSignup?: (e: React.FormEvent<HTMLFormElement>, name: string, email: string, password: string, tier?: string) => Promise<void>;
  loading?: boolean;
  message?: string;
  name?: string;
  setName?: (value: string) => void;
  email?: string;
  setEmail?: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
  username?: string;
  setUsername?: (value: string) => void;
  age?: string;
  setAge?: (value: string) => void;
  classCode?: string;
  setClassCode?: (value: string) => void;
  isStudent?: boolean;
  showGoogle?: boolean;
  initialTier?: string | null;
}

const tiers = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    description: 'Perfekt för att komma igång',
    color: 'from-gray-400 to-gray-600',
    icon: Sparkles,
    features: [
      { text: '1 klass', included: true },
      { text: '30 elever', included: true },
      { text: '5 ordlistor', included: true },
      { text: 'Alla speltyper', included: true },
      { text: 'Session Mode', included: false },
      { text: 'Progress & Quiz-statistik', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 79,
    description: 'För lärare som vill ha mer kontroll',
    color: 'from-violet-500 to-cyan-500',
    icon: Zap,
    features: [
      { text: '3 klasser', included: true },
      { text: '30 elever per klass', included: true },
      { text: '20 ordlistor', included: true },
      { text: 'Alla speltyper', included: true },
      { text: 'Session Mode', included: true },
      { text: 'Progress & Quiz-statistik', included: false },
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 129,
    description: 'Fullständig kontroll och insikter',
    color: 'from-amber-500 to-orange-500',
    icon: Crown,
    features: [
      { text: 'Obegränsade klasser', included: true },
      { text: 'Obegränsade elever', included: true },
      { text: 'Obegränsade ordlistor', included: true },
      { text: 'Alla speltyper', included: true },
      { text: 'Session Mode', included: true },
      { text: 'Full access till Progress & Quiz-statistik', included: true },
    ],
  },
]

export default function SpellSchoolSignup({
  onGoogleSignup,
  onEmailSignup,
  loading = false,
  message = "",
  name = "",
  setName,
  email = "",
  setEmail,
  password = "",
  setPassword,
  username = "",
  setUsername,
  age = "",
  setAge,
  classCode = "",
  setClassCode,
  isStudent = false,
  showGoogle = true,
  initialTier = null,
}: SpellSchoolSignupProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(initialTier)
  const [showTierSelection, setShowTierSelection] = useState(true)

  useEffect(() => {
    // Check if tier is provided as prop
    if (initialTier && ['free', 'premium', 'pro'].includes(initialTier)) {
      setSelectedTier(initialTier)
      setShowTierSelection(false)
    } else if (!isStudent) {
      // Only show tier selection for teachers
      setShowTierSelection(true)
    } else {
      setShowTierSelection(false)
    }
  }, [initialTier, isStudent])

  if (showTierSelection && !isStudent) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Aurora background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-[#12122a] rounded-2xl shadow-2xl max-w-5xl w-full p-8 border border-white/10"
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Välj din plan</h2>
            <p className="text-gray-400">Välj den plan som passar dig bäst</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {tiers.map((tier) => {
              const Icon = tier.icon
              return (
                <motion.button
                  key={tier.id}
                  onClick={() => {
                    setSelectedTier(tier.id)
                    setShowTierSelection(false)
                  }}
                  className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                    selectedTier === tier.id
                      ? `border-${tier.color.split('-')[1]}-500 bg-${tier.color.split('-')[1]}-500/10`
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Populär
                      </span>
                    </div>
                  )}
                  <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
                  <div className="mb-4">
                    {tier.monthlyPrice === 0 ? (
                      <span className="text-3xl font-bold text-white">Gratis</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">{tier.monthlyPrice}</span>
                        <span className="text-gray-400 ml-1">kr/månad</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <X className="w-4 h-4 text-gray-600" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600 line-through'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.button>
              )
            })}
          </div>

          <div className="text-center">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
              Tillbaka till startsidan
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#12122a] rounded-2xl shadow-2xl max-w-md w-full p-8 border border-white/10"
      >
        {selectedTier && !isStudent && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Vald plan:</span>
              <span className="text-white font-semibold capitalize">{selectedTier}</span>
            </div>
            <button
              onClick={() => {
                setSelectedTier(null)
                setShowTierSelection(true)
              }}
              className="text-xs text-violet-400 hover:text-violet-300 mt-2"
            >
              Ändra plan
            </button>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isStudent ? 'Skapa elevkonto' : 'Skapa lärarkonto'}
          </h2>
          <p className="text-sm text-gray-400">
            {isStudent ? 'Börja din språkresa med Spell School' : 'Kom igång med Spell School'}
          </p>
        </div>

        <FormContents
          onGoogleSignup={onGoogleSignup}
          onEmailSignup={onEmailSignup}
          loading={loading}
          message={message}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          username={username}
          setUsername={setUsername}
          age={age}
          setAge={setAge}
          classCode={classCode}
          setClassCode={setClassCode}
          isStudent={isStudent}
          showGoogle={showGoogle}
          selectedTier={selectedTier || undefined}
        />
      </motion.div>
    </div>
  );
}

interface FormContentsProps {
  onGoogleSignup?: () => Promise<void>;
  onEmailSignup?: (e: React.FormEvent<HTMLFormElement>, name: string, email: string, password: string, tier?: string) => Promise<void>;
  loading?: boolean;
  message?: string;
  name?: string;
  setName?: (value: string) => void;
  email?: string;
  setEmail?: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
  username?: string;
  setUsername?: (value: string) => void;
  age?: string;
  setAge?: (value: string) => void;
  classCode?: string;
  setClassCode?: (value: string) => void;
  isStudent?: boolean;
  showGoogle?: boolean;
  selectedTier?: string;
}

function FormContents({
  onGoogleSignup,
  onEmailSignup,
  loading = false,
  message = "",
  name = "",
  setName,
  email = "",
  setEmail,
  password = "",
  setPassword,
  username = "",
  setUsername,
  age = "",
  setAge,
  classCode = "",
  setClassCode,
  isStudent = false,
  showGoogle = true,
  selectedTier,
}: FormContentsProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onEmailSignup) {
      if (isStudent) {
        // For students, email is generated automatically, so we pass empty string
        await onEmailSignup(e, username, '', password);
      } else {
        await onEmailSignup(e, name, email, password, selectedTier);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Google CTA */}
      {showGoogle && onGoogleSignup && (
        <>
          <button
            type="button"
            onClick={onGoogleSignup}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#12122a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5"/>
            Fortsätt med Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#12122a] text-gray-500">eller</span>
            </div>
          </div>
        </>
      )}

      {/* Student-specific fields */}
      {isStudent && (
        <>
          {/* Username */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Användarnamn</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername?.(e.target.value)}
                placeholder="Välj ett användarnamn"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
              />
            </div>
          </label>

          {/* Age */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Ålder</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="number"
                min="5"
                max="18"
                value={age}
                onChange={(e) => setAge?.(e.target.value)}
                placeholder="Ange din ålder"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
              />
            </div>
          </label>

          {/* Class Code */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Klasskod</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="text"
                value={classCode}
                onChange={(e) => setClassCode?.(e.target.value.toUpperCase())}
                placeholder="Ange klasskod"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all uppercase"
              />
            </div>
          </label>
        </>
      )}

      {/* Teacher-specific fields */}
      {!isStudent && (
        <>
          {/* Name */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Fullständigt namn</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName?.(e.target.value)}
                placeholder="Ange ditt fullständiga namn"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
              />
            </div>
          </label>

          {/* Email */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">E-post</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail?.(e.target.value)}
                placeholder="du@skola.se"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
              />
            </div>
          </label>
        </>
      )}

      {/* Password */}
      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-1.5 block">Lösenord</span>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword?.(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
          />
        </div>
      </label>

      {/* Error/Success message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          message.includes('Error') || message.includes('error') || message.includes('Fel')
            ? 'text-red-400 bg-red-500/10 border border-red-500/30'
            : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
        }`}>
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || (!isStudent && !selectedTier)}
        className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white px-4 py-3 rounded-xl font-semibold hover:from-violet-400 hover:to-cyan-400 transition-all shadow-lg shadow-violet-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? 'Skapar konto...' : (isStudent ? 'Skapa elevkonto' : 'Skapa lärarkonto')}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>

      {/* Helpers */}
      <p className="text-center text-sm text-gray-400">
        Har du redan ett konto? <Link className="font-medium text-violet-400 hover:text-violet-300 underline" href="/">Logga in</Link>
      </p>
    </form>
  );
}
