"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const pathname = usePathname()
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null
  return (
    <header className="bg-gray-900 border-b border-white/10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 grid place-items-center font-bold">SS</div>
          <span className="text-lg font-bold">Spell School</span>
        </Link>
        <nav className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>
    </header>
  )
}


