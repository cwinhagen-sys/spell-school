'use client'

import { useState } from 'react'
import { levelForXp, deltaXp, cumulativeXp } from '@/lib/leveling'
import { updateStudentProgress } from '@/lib/tracking'

export default function XpTestPage() {
  const [testScore, setTestScore] = useState(100)
  const [gameType, setGameType] = useState<'flashcards' | 'match' | 'typing' | 'story' | 'translate'>('flashcards')
  const [message, setMessage] = useState('')

  const handleTestProgress = async () => {
    try {
      setMessage('Testar framstegsuppdatering...')
      await updateStudentProgress(testScore, gameType)
      setMessage(`Framsteg uppdaterat! Poäng: ${testScore}, Typ: ${gameType}`)
    } catch (error) {
      setMessage(`Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`)
    }
  }

  // Test XP calculations
  const testXpValues = [0, 100, 500, 1000, 5000, 10000, 50000, 100000]
  const xpResults = testXpValues.map(xp => {
    const result = levelForXp(xp)
    return { xp, ...result }
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-center">XP & Poäng Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* XP Calculation Test */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">XP Beräkningar</h2>
          <p className="text-gray-600 mb-4">
            Testa hur olika XP-värden påverkar nivå och framsteg.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">XP</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nivå</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Framsteg</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nästa Delta</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {xpResults.map((result) => (
                  <tr key={result.xp}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{result.xp.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{result.level}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {Math.round(result.progressToNext * 100)}%
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{result.nextDelta.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Update Test */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Testa Framstegsuppdatering</h2>
          <p className="text-gray-600 mb-4">
            Simulera ett spelresultat och uppdatera framsteg.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="test-score" className="block text-sm font-medium text-gray-700 mb-2">
                Spelpoäng (innan 75% reduktion):
              </label>
              <input
                id="test-score"
                type="number"
                value={testScore}
                onChange={(e) => setTestScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="10"
              />
              <p className="text-sm text-gray-500 mt-1">
                Faktiska poäng som sparas: {Math.round(testScore * 1)}
              </p>
            </div>

            <div>
              <label htmlFor="game-type" className="block text-sm font-medium text-gray-700 mb-2">
                Speltyp:
              </label>
              <select
                id="game-type"
                value={gameType}
                onChange={(e) => setGameType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="flashcards">Flashcards</option>
                <option value="match">Match</option>
                <option value="typing">Typing</option>
                <option value="story">Story</option>
                <option value="translate">Translate</option>
              </select>
            </div>

            <button
              onClick={handleTestProgress}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Testa Framstegsuppdatering
            </button>

            {message && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Level Details */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Detaljerad Nivåinformation</h2>
        <p className="text-gray-600 mb-4">
          Här kan du se exakt hur många XP som behövs för varje nivå.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(level => {
            const delta = deltaXp(level)
            const cumulative = cumulativeXp(level)
            return (
              <div key={level} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-center mb-2">Nivå {level}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>XP till nästa: {delta.toLocaleString()}</div>
                  <div>Total XP: {cumulative.toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Important Notes */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Viktiga Noter</h3>
        <ul className="text-yellow-700 space-y-2">
          <li>• <strong>Skalning:</strong> Spelen använder nu 1x – visad poäng = sparad poäng</li>
          <li>• <strong>XP vs Poäng:</strong> XP beräknas från de sparade poängen (efter reduktion)</li>
          <li>• <strong>Nivåsystem:</strong> Använder geometrisk progression med 1.06x tillväxt</li>
          <li>• <strong>Max nivå:</strong> 100 med totalt ~500,000 XP</li>
          <li>• <strong>Framsteg:</strong> Visas som procent till nästa nivå</li>
        </ul>
      </div>
    </div>
  )
}

