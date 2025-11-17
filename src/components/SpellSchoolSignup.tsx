'use client'

import React from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isStudent ? 'Skapa elevkonto' : 'Skapa lärarkonto'}
          </h2>
          <p className="text-sm text-gray-600">
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
        />
      </motion.div>
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Google CTA */}
      {showGoogle && onGoogleSignup && (
        <>
          <button
            type="button"
            onClick={onGoogleSignup}
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
        </>
      )}

      {/* Student-specific fields */}
      {isStudent && (
        <>
          {/* Username */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">Användarnamn</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername?.(e.target.value)}
                placeholder="Välj ett användarnamn"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </label>

          {/* Age */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">Ålder</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
              <input
                required
                type="number"
                min="5"
                max="18"
                value={age}
                onChange={(e) => setAge?.(e.target.value)}
                placeholder="Ange din ålder"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </label>

          {/* Class Code */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">Klasskod</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
              <input
                required
                type="text"
                value={classCode}
                onChange={(e) => setClassCode?.(e.target.value.toUpperCase())}
                placeholder="Ange klasskod"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all uppercase"
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
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">Fullständigt namn</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName?.(e.target.value)}
                placeholder="Ange ditt fullständiga namn"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </label>

          {/* Email */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">E-post</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail?.(e.target.value)}
                placeholder="du@skola.se"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </label>
        </>
      )}

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
            minLength={6}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </label>

      {/* Error/Success message */}
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.includes('Error') || message.includes('error') || message.includes('Fel')
            ? 'text-red-700 bg-red-50 border border-red-200'
            : 'text-green-700 bg-green-50 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Skapar konto...' : (isStudent ? 'Skapa elevkonto' : 'Skapa lärarkonto')}
      </button>

      {/* Helpers */}
      <p className="text-center text-sm text-gray-600">
        Har du redan ett konto? <Link className="font-medium text-purple-600 hover:text-purple-700 underline" href="/">Logga in</Link>
      </p>
    </form>
  );
}
