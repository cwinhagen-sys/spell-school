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
    yearlyPrice: 0,
    description: 'Perfect for getting started',
    color: 'from-gray-400 to-gray-600',
    icon: Sparkles,
    features: [
      { text: '1 class', included: true },
      { text: '30 students', included: true },
      { text: '5 word lists', included: true },
      { text: 'All game types', included: true },
      { text: 'Session Mode', included: false },
      { text: 'Progress & Quiz statistics', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 29,
    yearlyPrice: 299,
    description: 'For teachers who want more control',
    color: 'from-amber-500 to-orange-500',
    icon: Zap,
    features: [
      { text: '3 classes', included: true },
      { text: '30 students per class', included: true },
      { text: '20 word lists', included: true },
      { text: 'All game types', included: true },
      { text: 'Session Mode', included: true },
      { text: 'Progress & Quiz statistics', included: false },
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49,
    yearlyPrice: 499,
    description: 'Full control and insights',
    color: 'from-rose-500 to-pink-500',
    icon: Crown,
    features: [
      { text: 'Unlimited classes', included: true },
      { text: 'Unlimited students', included: true },
      { text: 'Unlimited word lists', included: true },
      { text: 'All game types', included: true },
      { text: 'Session Mode', included: true },
      { text: 'Full access to Progress & Quiz statistics', included: true },
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
  // Always use free tier for new signups - no tier selection
  const selectedTier = 'free'
  const yearly = false

  // Tier selection removed - always go directly to form
  if (false) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[#08080f]" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-[#12122a] rounded-2xl shadow-2xl max-w-5xl w-full p-8 border border-white/10"
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-gray-400">Select the plan that suits you best</p>
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
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Popular
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
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">
                          {yearly ? tier.yearlyPrice : tier.monthlyPrice}
                        </span>
                        <span className="text-gray-400 ml-1">
                          SEK/{yearly ? 'year' : 'month'}
                        </span>
                        {yearly && tier.yearlyPrice > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            ({Math.round(tier.yearlyPrice / 12)} SEK/month)
                          </div>
                        )}
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

          {/* Billing Period Toggle - only show for paid tiers */}
          {selectedTier && selectedTier !== 'free' && (
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Billing period:</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setYearly(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    !yearly
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setYearly(true)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    yearly
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Yearly
                </button>
              </div>
              {yearly && selectedTier !== 'free' && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Save {Math.round((tiers.find(t => t.id === selectedTier)?.monthlyPrice || 0) * 12 - (tiers.find(t => t.id === selectedTier)?.yearlyPrice || 0))} SEK per year
                </p>
              )}
            </div>
          )}

          <div className="text-center">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#12122a] rounded-2xl shadow-2xl max-w-xl w-full p-8 md:p-10 border border-white/10"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isStudent ? 'Create Student Account' : 'Create Teacher Account'}
          </h2>
          <p className="text-sm text-gray-400">
            {isStudent ? 'Start your language journey with Spell School' : 'Get started with Spell School'}
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
          selectedTier={selectedTier}
          yearly={yearly}
        />
      </motion.div>
    </div>
  );
}

interface FormContentsProps {
  onGoogleSignup?: () => Promise<void>;
  onEmailSignup?: (e: React.FormEvent<HTMLFormElement>, name: string, email: string, password: string, tier?: string, yearly?: boolean) => Promise<void>;
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
  yearly?: boolean;
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
  yearly = false,
}: FormContentsProps) {
  // Check if signup was successful (user needs to verify email)
  const signupSuccessful = message?.includes('check your email') || 
                           message?.includes('Account created successfully') ||
                           (message?.includes('✅') && !message?.includes('Error') && !message?.includes('error'))
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Prevent submission if signup was already successful
    if (signupSuccessful) return;
    
    if (onEmailSignup) {
      if (isStudent) {
        // For students, email is generated automatically, so we pass empty string
        await onEmailSignup(e, username, '', password);
      } else {
        await onEmailSignup(e, name, email, password, selectedTier, yearly);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Google CTA - Hide if signup was successful */}
      {!signupSuccessful && showGoogle && onGoogleSignup && (
        <>
          <button
            type="button"
            onClick={onGoogleSignup}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#12122a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5"/>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#12122a] text-gray-500">or</span>
            </div>
          </div>
        </>
      )}

      {/* Student-specific fields */}
      {isStudent && !signupSuccessful && (
        <>
          {/* Username */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Username</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername?.(e.target.value)}
                placeholder="Choose a username"
                disabled={signupSuccessful}
                className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </label>

          {/* Age */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Age</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="number"
                min="5"
                max="18"
                value={age}
                onChange={(e) => setAge?.(e.target.value)}
                placeholder="Enter your age"
                className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
              />
            </div>
          </label>

          {/* Class Code */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Class Code</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="text"
                value={classCode}
                onChange={(e) => setClassCode?.(e.target.value.toUpperCase())}
                placeholder="Enter class code"
                className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all uppercase"
              />
            </div>
          </label>
        </>
      )}

      {/* Teacher-specific fields */}
      {!isStudent && !signupSuccessful && (
        <>
          {/* Name */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Full Name</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName?.(e.target.value)}
                placeholder="Your full name"
                disabled={signupSuccessful}
                className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </label>

          {/* Email */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1.5 block">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail?.(e.target.value)}
                placeholder="you@school.com"
                disabled={signupSuccessful}
                className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </label>
        </>
      )}

      {/* Password */}
      {!signupSuccessful && (
        <label className="block">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block">Password</span>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"/>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword?.(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              disabled={signupSuccessful}
              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </label>
      )}

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

      {/* Submit - Hide button if signup was successful (check your email message) */}
      {!message?.includes('check your email') && !message?.includes('Account created successfully') && (
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3.5 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? 'Creating account...' : (isStudent ? 'Create Student Account' : 'Create Teacher Account')}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      )}

      {/* Helpers */}
      <p className="text-center text-sm text-gray-400">
        Already have an account? <Link className="font-medium text-amber-400 hover:text-amber-300 underline" href="/">Sign in</Link>
      </p>
    </form>
  );
}
