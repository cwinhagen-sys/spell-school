'use client'

import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  
  // Redirect directly to teacher signup since only teachers can register
  if (typeof window !== 'undefined') {
    router.replace('/signup/teacher')
  }

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center px-6 py-12">
      <div className="text-center text-gray-400">Redirecting…</div>
    </div>
  )
}