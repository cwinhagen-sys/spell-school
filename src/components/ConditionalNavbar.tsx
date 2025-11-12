"use client"

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Don't show Navbar on student pages (they have their own top bar)
  if (pathname?.startsWith('/student')) {
    return null
  }
  
  return <Navbar />
}

