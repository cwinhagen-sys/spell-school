import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const word = searchParams.get('word')
  const apiKey = process.env.MERRIAM_WEBSTER_API_KEY

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${apiKey}`
    )
    
    if (!response.ok) {
      throw new Error(`Dictionary API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Dictionary API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch word data' },
      { status: 500 }
    )
  }
}



























