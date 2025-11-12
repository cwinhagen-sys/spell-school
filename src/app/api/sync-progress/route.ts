import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { points, userId } = await request.json()
    
    if (!points || !userId) {
      return NextResponse.json({ error: 'Missing points or userId' }, { status: 400 })
    }

    // Update student progress in database
    const { error } = await supabase
      .from('student_progress')
      .upsert({
        student_id: userId,
        word_set_id: null,
        homework_id: null,
        total_points: points,
        last_played_at: new Date().toISOString()
      }, { onConflict: 'student_id,word_set_id,homework_id' })

    if (error) {
      console.error('Error syncing progress:', error)
      return NextResponse.json({ error: 'Failed to sync progress' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in sync-progress API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
