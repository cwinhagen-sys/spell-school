'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  // Redirect to home (primary login)
  if (typeof window !== 'undefined') {
    window.location.replace('/')
  }
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
      <div className="text-center text-gray-300">Redirecting…</div>
    </div>
  )
}


