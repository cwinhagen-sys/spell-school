'use client'

import React, { useState } from 'react'
import { AlertCircle, Mail, CheckCircle } from 'lucide-react'
import { resendVerificationEmail } from '@/lib/email-verification'

interface EmailVerificationBannerProps {
  className?: string
  onVerified?: () => void
}

/**
 * Banner component that displays when user's email is not verified
 * Shows resend verification email button
 */
export default function EmailVerificationBanner({ className = '', onVerified }: EmailVerificationBannerProps) {
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const handleResend = async () => {
    setResending(true)
    setResendError(null)
    setResendSuccess(false)

    const result = await resendVerificationEmail()

    if (result.success) {
      setResendSuccess(true)
      setTimeout(() => {
        setResendSuccess(false)
      }, 5000)
    } else {
      setResendError(result.error || 'Failed to send verification email')
    }

    setResending(false)
  }

  return (
    <div className={`bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-200 mb-1">
            Please verify your email address
          </h3>
          <p className="text-sm text-amber-200/80 mb-3">
            We've sent a verification email to your inbox. Please click the link in the email to verify your account and continue using Spell School.
          </p>
          
          {resendSuccess && (
            <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Verification email sent! Check your inbox.</span>
            </div>
          )}

          {resendError && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">{resendError}</p>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending || resendSuccess}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            {resending ? 'Sending...' : resendSuccess ? 'Email sent!' : 'Resend verification email'}
          </button>
        </div>
      </div>
    </div>
  )
}
