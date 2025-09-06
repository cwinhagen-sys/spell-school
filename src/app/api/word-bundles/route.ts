import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Fetch all predefined word bundles
    const { data: bundles, error } = await supabase
      .from('word_bundles')
      .select('*')
      .eq('is_predefined', true)
      .order('category', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching word bundles:', error)
      return NextResponse.json({ error: 'Failed to fetch word bundles' }, { status: 500 })
    }

    return NextResponse.json({ bundles: bundles || [] })
  } catch (error) {
    console.error('Error in word-bundles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

