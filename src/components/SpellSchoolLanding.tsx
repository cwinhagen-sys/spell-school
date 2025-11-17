'use client'

import React from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
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
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Main Content */}
      <div className="relative min-h-screen flex">
        {/* Left Side - Image (no fade, strong and clear) */}
        <div className="hidden lg:block lg:w-1/2 relative border-r-4 border-black">
          <img
            src={posterUrl}
            alt="Wizard"
            className="h-full w-full object-cover"
            style={{ objectPosition: '60% center' }}
          />
        </div>

        {/* Right Side - Purple background with Login Form */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-md"
          >
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
      </div>
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
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-300 p-8">
      {/* Welcome text and intro */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Välkommen till Spell School</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Tilldela glosor till dina elever och låt dem lära sig genom magiska övningar. 
          Ett pedagogiskt verktyg som gör språkinlärning roligt och engagerande.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

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
    </div>
  );
}
