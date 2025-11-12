'use client'

import React from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Wand2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * SpellSchoolLanding
 *
 * A polished, accessible landing view where the login form is GRAPHICALLY
 * integrated into the brand art. The wizard artwork frames a "magic parchment"
 * that contains the login UI. Subtle sparkles and a glow connect the staff orb
 * to the parchment, making it feel like a single composition.
 *
 * How to use
 * ---------
 * - Ensure TailwindCSS is configured.
 * - This component is self‑contained; drop it into your app shell.
 * - Provide the wizard art via the `logoUrl` and optional `posterUrl` props.
 *   - `logoUrl` (square) is used in the top bar and for SEO/social.
 *   - `posterUrl` (wider) is used as the large hero art behind the parchment.
 *   If you only have one image, pass it to both props.
 * - Hook up your auth handlers on the form `onSubmit` and the Google button.
 *
 * Design notes
 * ------------
 * - Color tokens mirror the brand: deep teal background and warm gold accents.
 * - Form sits on a parchment card with deckled edges and subtle texture.
 * - Strong contrast & focus styles for accessibility (WCAG AA+ where possible).
 * - Mobile-first layout: the parchment stacks under the masthead; on larger
 *   screens it overlaps the hero art as an embedded element.
 */

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
  logoUrl = "/images/memory-card-back.png", // square logo (e.g., your provided 1024×1024)
  posterUrl = "/images/memory-card-back.png", // wide hero (can reuse logoUrl)
  onEmailLogin,
  onGoogleLogin,
  loading = false,
  message = "",
  identifier = "",
  setIdentifier,
  password = "",
  setPassword,
}: SpellSchoolLandingProps) {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center">
      {/* Unified gold frame containing BOTH image and form (seamless edge) */}
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

            {/* Right: Parchment login (no outer border here; uses the shared frame) */}
            <div className="relative md:col-span-2 bg-white">
              <div className="h-full w-full p-[2px]">
                {/* White background for login form */}
                <div className="h-full rounded-none md:rounded-none bg-white">
                  <div className="h-full bg-white">
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
    <form
      onSubmit={handleSubmit}
      className="relative isolate mx-auto grid w-full max-w-md gap-3 rounded-[20px] px-4 py-4 sm:px-5 sm:py-5 bg-white h-full overflow-y-auto"
    >
      {/* Title & wand embellishment */}
      <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-[#f1c55b] to-[#a87a2c] p-[1px]">
            <div className="rounded-lg bg-white p-1.5">
            <Wand2 className="h-4 w-4 text-[#7b5a1e]" aria-hidden="true" />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[#3b2f17]">Welcome back, apprentice</h2>
          <p className="text-[10px] text-[#5b4a27]">Continue your language quest</p>
        </div>
      </div>

      {/* Google CTA */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        className="group inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#a87a2c]/40 bg-white/90 px-2.5 py-2 text-xs font-medium text-[#2b2010] shadow hover:bg-white focus:outline-none focus-visible:ring-3 focus-visible:ring-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-4 w-4"/>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative my-0.5">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#a87a2c]/50 to-transparent" />
            <span className="absolute inset-x-0 -top-2 mx-auto w-max rounded-full bg-white px-1.5 text-[10px] uppercase tracking-wider text-[#7b5a1e]">or</span>
      </div>

      {/* Email/Username */}
      <label className="grid gap-0.5">
        <span className="text-[10px] font-medium text-[#3b2f17]">Username or Email</span>
        <div className="relative flex items-center">
          <Mail className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#7b5a1e]"/>
          <input
            required
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier?.(e.target.value)}
            placeholder="you@school.com or username"
            className="w-full rounded-md border border-[#a87a2c]/50 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-[#7b5a1e]/70 shadow focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-normal"
          />
        </div>
      </label>

      {/* Password */}
      <label className="grid gap-0.5">
        <span className="text-[10px] font-medium text-[#3b2f17]">Password</span>
        <div className="relative flex items-center">
          <Lock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#7b5a1e]"/>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword?.(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-[#a87a2c]/50 bg-white/90 pl-9 pr-2.5 py-1.5 text-xs text-[#1c1409] placeholder:text-[#7b5a1e]/70 shadow focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-normal"
          />
        </div>
      </label>

      {/* Error message */}
      {message && (
        <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 px-2.5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 disabled:opacity-50 disabled:cursor-not-allowed border-[1.5px] border-indigo-700"
      >
        {loading ? 'Signing in…' : 'Login'}
        {!loading && <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5"/>}
      </button>

      {/* Helpers */}
      <p className="text-center text-[10px] text-[#5b4a27]">
        No account? <Link className="font-medium text-[#7b5a1e] underline decoration-dotted underline-offset-2 hover:text-[#3b2f17]" href="/signup">Sign up</Link>
      </p>

      {/* Accessibility notes for screen readers */}
      <span className="sr-only">All inputs are required to sign in.</span>
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

