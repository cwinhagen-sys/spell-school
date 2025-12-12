'use client'

import { useState, useEffect } from 'react'
import { Upload, Search, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImageSelectorProps {
  value?: string
  onChange: (imageUrl: string) => void
  onClear: () => void
  word: string
  wordIndex?: number
}

interface UnsplashImage {
  id: string
  urls: {
    small: string
    regular: string
  }
  alt_description: string
  user: {
    name: string
  }
}

export default function ImageSelector({ value, onChange, onClear, word, wordIndex = 0 }: ImageSelectorProps) {
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState(word)
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

  // Search for images on Unsplash
  const searchImages = async (query: string) => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
      
      if (!apiKey || apiKey === 'YOUR_UNSPLASH_ACCESS_KEY') {
        setUnsplashImages([])
        return
      }
      
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&client_id=${apiKey}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setUnsplashImages(data.results || [])
      } else {
        setUnsplashImages([])
      }
    } catch (error) {
      console.error('Error fetching images:', error)
      setUnsplashImages([])
    } finally {
      setLoading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setUploadFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload file to Supabase storage
  const uploadToStorage = async (file: File): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('word-images')
      .upload(`${Date.now()}-${file.name}`, file)
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('word-images')
      .getPublicUrl(data.path)
    
    return publicUrl
  }

  // Handle image selection
  const handleImageSelect = async (imageUrl: string) => {
    onChange(imageUrl)
    setShowModal(false)
  }

  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile) return
    
    try {
      setLoading(true)
      const imageUrl = await uploadToStorage(uploadFile)
      onChange(imageUrl)
      setShowModal(false)
      setUploadFile(null)
      setUploadPreview(null)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Search when modal opens or when word changes
  useEffect(() => {
    if (showModal) {
      searchImages(searchQuery)
    }
  }, [showModal, word])

  // Auto-search when word prop changes
  useEffect(() => {
    if (word && word !== searchQuery) {
      setSearchQuery(word)
      if (showModal) {
        searchImages(word)
      }
    }
  }, [word])

  return (
    <>
      {/* Image preview/selector button */}
      <div className="flex items-center gap-2">
        {value ? (
          <div className="relative group">
            <img 
              src={value} 
              alt={word}
              className="w-12 h-12 object-cover rounded-lg border border-white/10"
            />
            <button
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-12 h-12 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center hover:border-white/40 transition-colors bg-white/5"
          >
            <ImageIcon className="w-5 h-5 text-gray-500" />
          </button>
        )}
        <button
          onClick={() => setShowModal(true)}
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
        >
          {value ? 'Change image' : 'Add image'}
        </button>
      </div>

      {/* Inline Image Selector */}
      {showModal && (
        <div className="mt-4 p-4 bg-[#1a1a2e] rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-white">Select image for "{word}"</h4>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchImages(searchQuery)}
                placeholder="Search for images..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => searchImages(searchQuery)}
              disabled={loading}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 font-medium transition-all"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Upload section */}
          <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <h5 className="font-medium mb-3 text-gray-300 text-sm">Or upload your own image:</h5>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id={`image-upload-${wordIndex}`}
              />
              <label
                htmlFor={`image-upload-${wordIndex}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">Choose file</span>
              </label>
              {uploadPreview && (
                <div className="flex items-center gap-3">
                  <img src={uploadPreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 text-sm font-medium transition-all"
                  >
                    Upload
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image grid */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Searching for images...</p>
              </div>
            ) : !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY' ? (
              <div className="text-center py-6">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-3">
                  <h5 className="font-semibold text-cyan-400 mb-2 text-sm">🔍 Automatic image suggestions</h5>
                  <p className="text-xs mb-2 text-gray-400">To get automatic image suggestions when you type words, you need an Unsplash API key.</p>
                  <p className="text-xs text-cyan-500">See UNSPLASH_SETUP.md for instructions</p>
                </div>
                <p className="text-xs text-gray-500">You can still upload your own images above ↑</p>
              </div>
            ) : unsplashImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {unsplashImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageSelect(image.urls.regular)}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all"
                  >
                    <img
                      src={image.urls.small}
                      alt={image.alt_description}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No images found. Try a different search term.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
