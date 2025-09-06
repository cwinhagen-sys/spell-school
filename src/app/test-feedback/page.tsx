'use client'

import { useState } from 'react'

export default function TestFeedbackPage() {
  const [sentence, setSentence] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testSentences = [
    { text: "I am happy.", description: "Perfect sentence" },
    { text: "I is happy.", description: "Grammar error" },
    { text: "I am note.", description: "Using noun as adjective" },
    { text: "Happy", description: "Just words, no sentence" },
    { text: "I am very happy when I play with my friends.", description: "Advanced sentence" },
    { text: "I am calm and raise my hand.", description: "Good sentence with multiple words" },
    { text: "I go school.", description: "Missing preposition" },
    { text: "He are happy.", description: "Wrong verb form" }
  ]

  const testFeedback = async (testSentence: string) => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/analyze-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: testSentence,
          requiredWords: [{ word: "happy", translation: "glad" }],
          spinMode: 1
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Feedback System</h1>
        
        {/* Manual Test */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Manual Test</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Sentence:</label>
              <input
                type="text"
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Enter a sentence to test..."
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={() => testFeedback(sentence)}
              disabled={loading || !sentence.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Feedback'}
            </button>
          </div>
        </div>

        {/* Quick Tests */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testSentences.map((test, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-2">
                  <strong>Sentence:</strong> "{test.text}"
                </div>
                <div className="mb-2 text-sm text-gray-600">
                  {test.description}
                </div>
                <button
                  onClick={() => testFeedback(test.text)}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Test
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            {result.error ? (
              <div className="text-red-600">
                Error: {result.error}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <strong>Quality:</strong> {result.quality}
                  </div>
                  <div>
                    <strong>Color:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      result.color === 'green' ? 'bg-green-100 text-green-800' :
                      result.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.color}
                    </span>
                  </div>
                </div>
                <div>
                  <strong>Feedback:</strong>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    {result.feedback}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


