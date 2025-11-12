'use client'

import React from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Wand2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SpellSchoolSignupProps {
  logoUrl?: string;
  posterUrl?: string;
  onGoogleSignup?: () => Promise<void>;
  onEmailSignup?: (e: React.FormEvent<HTMLFormElement>, name: string, email: string, password: string) => Promise<void>;
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
}

export default function SpellSchoolSignup({
  logoUrl = "/images/memory-card-back.png",
  posterUrl = "/images/memory-card-back.png",
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
}: SpellSchoolSignupProps) {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center">
      {/* Unified black frame containing BOTH image and form (seamless edge) */}
      <main className="relative mx-auto w-full max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="rounded-[18px] border-[3px] border-black shadow-2xl shadow-black/30 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 items-stretch h-[400px] md:h-[430px]">
            {/* Left: Hero image */}
            <div className="relative md:col-span-3 overflow-hidden">
              <img
                src={posterUrl}
                alt="Wizard conjuring a spell"
                className="h-full w-full object-cover"
                style={{ objectPosition: 'left top' }}
              />
              {/* Optional minimal sparkles, kept subtle and non-obscuring */}
              <SparklesLayer />
            </div>

            {/* Right: White signup form (no outer border here; uses the shared frame) */}
            <div className="relative md:col-span-2 bg-white">
              <div className="h-full w-full p-[2px]">
                {/* White background for signup form */}
                <div className="h-full rounded-none md:rounded-none bg-white">
                  <div className="h-full bg-white">
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
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

interface FormContentsProps {
  onGoogleSignup?: () => Promise<void>;
  onEmailSignup?: (e: React.FormEvent<HTMLFormElement>, name: string, email: string, password: string) => Promise<void>;
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
}: FormContentsProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onEmailSignup) {
      if (isStudent) {
        // For students, email is generated automatically, so we pass empty string
        await onEmailSignup(e, username, '', password);
      } else {
        await onEmailSignup(e, name, email, password);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative isolate mx-auto grid w-full max-w-md gap-3 rounded-[20px] px-4 py-4 sm:px-5 sm:py-5 bg-white h-full overflow-y-auto"
    >
      {/* Title & wand embellishment */}
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 p-[1px]">
          <div className="rounded-lg bg-white p-1.5">
            <Wand2 className="h-4 w-4 text-purple-700" aria-hidden="true" />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[#3b2f17]">
            {isStudent ? 'Join the magic' : 'Begin your journey'}
          </h2>
          <p className="text-[10px] text-[#5b4a27]">
            {isStudent ? 'Create your student account' : 'Create your teacher account'}
          </p>
        </div>
      </div>

      {/* Google CTA */}
      {showGoogle && (
        <>
          <button
            type="button"
            onClick={onGoogleSignup}
            disabled={loading}
            className="group inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white/90 px-2.5 py-2 text-xs font-medium text-[#2b2010] shadow hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-4 w-4"/>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-0.5">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />
            <span className="absolute inset-x-0 -top-2 mx-auto w-max rounded-full bg-white px-1.5 text-[10px] uppercase tracking-wider text-gray-600">or</span>
          </div>
        </>
      )}

      {/* Student-specific fields */}
      {isStudent && (
        <>
          {/* Username */}
          <label className="grid gap-0.5">
            <span className="text-[10px] font-medium text-[#3b2f17]">Username</span>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-600"/>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername?.(e.target.value)}
                placeholder="Choose a username"
                className="w-full rounded-md border border-gray-300 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-gray-500/70 shadow focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-normal"
              />
            </div>
          </label>

          {/* Age */}
          <label className="grid gap-0.5">
            <span className="text-[10px] font-medium text-[#3b2f17]">Age</span>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-600"/>
              <input
                required
                type="number"
                min="5"
                max="18"
                value={age}
                onChange={(e) => setAge?.(e.target.value)}
                placeholder="Enter your age"
                className="w-full rounded-md border border-gray-300 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-gray-500/70 shadow focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-normal"
              />
            </div>
          </label>

          {/* Class Code */}
          <label className="grid gap-0.5">
            <span className="text-[10px] font-medium text-[#3b2f17]">Class Code</span>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-600"/>
              <input
                required
                type="text"
                value={classCode}
                onChange={(e) => setClassCode?.(e.target.value.toUpperCase())}
                placeholder="Enter class code"
                className="w-full rounded-md border border-gray-300 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-gray-500/70 shadow focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-normal uppercase"
              />
            </div>
          </label>
        </>
      )}

      {/* Teacher-specific fields */}
      {!isStudent && (
        <>
          {/* Name */}
          <label className="grid gap-0.5">
            <span className="text-[10px] font-medium text-[#3b2f17]">Full Name</span>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-600"/>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName?.(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-md border border-gray-300 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-gray-500/70 shadow focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-normal"
              />
            </div>
          </label>

          {/* Email */}
          <label className="grid gap-0.5">
            <span className="text-[10px] font-medium text-[#3b2f17]">Email</span>
            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-600"/>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail?.(e.target.value)}
                placeholder="you@school.com"
                className="w-full rounded-md border border-gray-300 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-gray-500/70 shadow focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-normal"
              />
            </div>
          </label>
        </>
      )}


      {/* Password */}
      <label className="grid gap-0.5">
        <span className="text-[10px] font-medium text-[#3b2f17]">Password</span>
        <div className="relative flex items-center">
          <Lock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-600"/>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword?.(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            className="w-full rounded-md border border-gray-300 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-gray-500/70 shadow focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-normal"
          />
        </div>
      </label>

      {/* Error message */}
      {message && (
        <div className={`text-[10px] rounded-md px-2 py-1 border ${
          message.includes('Error') || message.includes('error')
            ? 'text-red-600 bg-red-50 border-red-200'
            : 'text-green-600 bg-green-50 border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 px-2.5 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:brightness-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 disabled:opacity-50 disabled:cursor-not-allowed border-[1.5px] border-purple-700"
      >
        {loading ? 'Creating account…' : (isStudent ? 'Create Student Account' : 'Create Teacher Account')}
        {!loading && <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5"/>}
      </button>

      {/* Helpers */}
      <p className="text-center text-[10px] text-[#5b4a27]">
        Already have an account? <Link className="font-medium text-purple-700 underline decoration-dotted underline-offset-2 hover:text-purple-800" href="/">Sign in</Link>
      </p>

      {/* Accessibility notes for screen readers */}
      <span className="sr-only">All inputs are required to sign up.</span>
    </form>
  );
}

function SparklesLayer() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* soft purple stars */}
      <g fill="#9333ea" opacity="0.9">
        <circle cx="20" cy="22" r=".8" />
        <circle cx="27" cy="30" r=".5" />
        <circle cx="70" cy="20" r=".6" />
        <circle cx="82" cy="35" r=".7" />
        <circle cx="15" cy="55" r=".4" />
        <circle cx="88" cy="68" r=".5" />
      </g>
      {/* subtle twinkle */}
      <g fill="#9333ea" opacity="0.35">
        <path d="M12 40 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 l3 -1.5 z"/>
        <path d="M90 18 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 z"/>
        <path d="M64 78 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 z"/>
      </g>
    </svg>
  );
}

