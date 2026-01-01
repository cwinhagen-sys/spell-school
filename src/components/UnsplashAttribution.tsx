'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'

interface UnsplashAttributionProps {
  photographerName?: string
  photographerUrl?: string
  unsplashUrl?: string
  className?: string
}

/**
 * Unsplash Attribution Component
 * Required by Unsplash API guidelines for Production access
 * Shows: "Photo by [Photographer Name] on Unsplash"
 * with links to photographer and Unsplash
 */
export default function UnsplashAttribution({
  photographerName,
  photographerUrl,
  unsplashUrl,
  className = ''
}: UnsplashAttributionProps) {
  // Only show attribution if we have photographer info (Unsplash image)
  if (!photographerName || !photographerUrl || !unsplashUrl) {
    return null
  }

  // Stop event propagation to prevent triggering parent click handlers (like card flip)
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    // Open link in new tab
    const target = e.currentTarget as HTMLAnchorElement
    if (target.href) {
      window.open(target.href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div 
      className={`text-xs text-white font-medium ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
    >
      <span className="mr-1">Photo by</span>
      <a
        href={photographerUrl}
        onClick={handleLinkClick}
        className="text-white hover:text-gray-200 transition-colors cursor-pointer no-underline font-semibold"
        title="Photographer profile"
        style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
      >
        {photographerName}
      </a>
      <span className="mx-1">on</span>
      <a
        href={unsplashUrl}
        onClick={handleLinkClick}
        className="text-white hover:text-gray-200 transition-colors inline-flex items-center gap-1 cursor-pointer no-underline font-semibold"
        title="Unsplash"
        style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
      >
        Unsplash
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}

