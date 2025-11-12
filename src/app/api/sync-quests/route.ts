import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { quests } = await request.json()
    
    if (!quests || !Array.isArray(quests)) {
      return NextResponse.json({ error: 'Invalid quests data' }, { status: 400 })
    }

    // Upsert quest progress to database
    const { error } = await supabase
      .from('user_daily_quest_progress')
      .upsert(quests, { onConflict: 'user_id,quest_date,quest_id' })

    if (error) {
      console.error('Error syncing quest progress:', error)
      return NextResponse.json({ error: 'Failed to sync quest progress' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in sync-quests API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
