'use client'

import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  
  // Redirect directly to teacher signup since only teachers can register
  if (typeof window !== 'undefined') {
    router.replace('/signup/teacher')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center px-6 py-12">
      <div className="text-center text-gray-300">Redirecting…</div>
    </div>
  )
}