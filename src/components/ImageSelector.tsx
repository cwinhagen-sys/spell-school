'use client'

import { useState, useEffect } from 'react'
import { Upload, Search, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImageSelectorProps {
  value?: string
  onChange: (imageUrl: string) => void
  onClear: () => void
  word: string
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

export default function ImageSelector({ value, onChange, onClear, word }: ImageSelectorProps) {
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
      // Check if Unsplash API key is available
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
              className="w-16 h-16 object-cover rounded-lg border border-white/10"
            />
            <button
              onClick={onClear}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-16 h-16 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center hover:border-white/40 transition-colors"
          >
            <ImageIcon className="w-6 h-6 text-white/60" />
          </button>
        )}
        <button
          onClick={() => setShowModal(true)}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          {value ? 'Change' : 'Add image'}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Choose image for "{word}"</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Search bar */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchImages(searchQuery)}
                    placeholder="Search for images..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/60"
                  />
                </div>
                <button
                  onClick={() => searchImages(searchQuery)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Upload section */}
              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h4 className="font-medium mb-2">Or upload your own image:</h4>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/15 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Choose file
                  </label>
                  {uploadPreview && (
                    <div className="flex items-center gap-2">
                      <img src={uploadPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Upload
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Image grid */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-white/60">Searching for images...</div>
              ) : !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY' ? (
                <div className="text-center py-8 text-white/60">
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-200 mb-2">🔍 Automatiska bildförslag</h4>
                    <p className="text-sm mb-2">För att få automatiska bildförslag när du skriver ord behöver du en Unsplash API-nyckel.</p>
                    <p className="text-xs text-blue-300">Se UNSPLASH_SETUP.md för instruktioner</p>
                  </div>
                  <p className="text-sm">Du kan fortfarande ladda upp egna bilder ovan ↑</p>
                </div>
              ) : unsplashImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {unsplashImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => handleImageSelect(image.urls.regular)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-blue-500 transition-colors"
                    >
                      <img
                        src={image.urls.small}
                        alt={image.alt_description}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  No images found. Try a different search term.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
