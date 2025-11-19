'use client'

import { useState } from 'react'

export default function TestModelPage() {
  const [model, setModel] = useState('gpt-5-mini')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testModel = async () => {
    setTesting(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ 
        success: false, 
        error: error.message,
        model 
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Test OpenAI Model</h1>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Name:
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., gpt-5-mini, gpt-4o-mini, gpt-4o"
            />
          </div>
          
          <button
            onClick={testModel}
            disabled={testing}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Testing...' : 'Test Model'}
          </button>
        </div>

        {result && (
          <div className={`p-6 rounded-xl border-2 ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h2 className="text-xl font-bold mb-4">
              {result.success ? '✅ Model Available' : '❌ Model Not Available'}
            </h2>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Model:</span> {result.model}
              </div>
              
              {result.success ? (
                <>
                  <div>
                    <span className="font-semibold">Status:</span> Available ✅
                  </div>
                  {result.response && (
                    <div className="mt-4 p-3 bg-white rounded border">
                      <span className="font-semibold">Response:</span>
                      <pre className="mt-2 text-xs overflow-auto">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <span className="font-semibold">Error:</span> {result.error || 'Unknown error'}
                  </div>
                  {result.code && (
                    <div>
                      <span className="font-semibold">Error Code:</span> {result.code}
                    </div>
                  )}
                  {result.status && (
                    <div>
                      <span className="font-semibold">HTTP Status:</span> {result.status}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Common Models to Test:</h3>
          <div className="flex flex-wrap gap-2">
            {['gpt-5-mini', 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo'].map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-800 transition-colors"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}







