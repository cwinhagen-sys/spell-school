import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { downgradeToFreeWithSelection } from '@/lib/subscription'

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classesToKeep, wordSetsToKeep } = body

    if (!Array.isArray(classesToKeep) || !Array.isArray(wordSetsToKeep)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const result = await downgradeToFreeWithSelection(user.id, classesToKeep, wordSetsToKeep)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to downgrade' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error downgrading to free:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}











