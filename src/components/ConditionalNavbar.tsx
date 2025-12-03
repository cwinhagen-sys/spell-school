"use client"

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Don't show Navbar on student pages (they have their own header in layout)
  if (pathname?.startsWith('/student')) {
    return null
  }
  
  // Don't show Navbar on session pages (they have their own dark theme header)
  if (pathname?.startsWith('/session')) {
    return null
  }
  
  // Don't show Navbar on pricing page (it has its own header)
  if (pathname === '/pricing') {
    return null
  }
  
  return <Navbar />
}



