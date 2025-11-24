import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// For PDF generation, we'll use a simple HTML-to-PDF approach
// or return HTML that can be printed/converted to PDF

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'progress' // 'progress' or 'quiz'

    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify teacher owns this session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, teacher_id, word_sets(id, title), due_date')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Extract word set title (word_sets is an array)
    const wordSetTitle = Array.isArray(session.word_sets) && session.word_sets.length > 0
      ? session.word_sets[0].title
      : 'Session'

    if (exportType === 'progress') {
      // Export progress data
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select(`
          id,
          student_name,
          joined_at,
          selected_blocks,
          session_progress (
            game_name,
            completed,
            score,
            created_at,
            updated_at
          )
        `)
        .eq('session_id', sessionId)

      if (participantsError) throw participantsError

      // Format as CSV
      const csvRows = [
        ['Student', 'Spel', 'Klar', 'Poäng (%)', 'Uppdaterad'].join(',')
      ]

      participants?.forEach((participant) => {
        if (participant.session_progress && Array.isArray(participant.session_progress)) {
          participant.session_progress.forEach((progress: any) => {
            csvRows.push([
              participant.student_name,
              progress.game_name,
              progress.completed ? 'Ja' : 'Nej',
              progress.score?.toString() || '0',
              new Date(progress.updated_at).toLocaleString('sv-SE')
            ].join(','))
          })
        } else {
          // No progress yet
          csvRows.push([
            participant.student_name,
            '-',
            'Nej',
            '0',
            '-'
          ].join(','))
        }
      })

      const csv = csvRows.join('\n')
      const filename = `session-${sessionId}-progress-${new Date().toISOString().split('T')[0]}.csv`

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } else if (exportType === 'quiz') {
      // Export quiz results as PDF
      // First, get all participants with their quiz results
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select('id, student_name, selected_blocks')
        .eq('session_id', sessionId)
        .order('student_name', { ascending: true })

      if (participantsError) throw participantsError

      // Get quiz responses grouped by participant
      const { data: quizResponses, error: quizError } = await supabase
        .from('session_quiz_responses')
        .select(`
          participant_id,
          word_en,
          word_sv,
          student_answer,
          is_correct,
          score,
          feedback,
          graded_by,
          graded_at
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (quizError) throw quizError

      // Group responses by participant
      const participantResults: Record<string, any[]> = {}
      quizResponses?.forEach((response: any) => {
        if (!participantResults[response.participant_id]) {
          participantResults[response.participant_id] = []
        }
        participantResults[response.participant_id].push(response)
      })

      // Calculate scores for each participant
      const participantScores: Record<string, { score: number; total: number }> = {}
      Object.keys(participantResults).forEach(pid => {
        const responses = participantResults[pid]
        const totalPoints = responses.reduce((sum, r) => {
          const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
          return sum + points
        }, 0)
        const totalPossible = responses.length * 2
        participantScores[pid] = { score: totalPoints, total: totalPossible }
      })

      // Generate HTML for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 20mm;
      size: A4;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #6366f1;
      margin-bottom: 10px;
    }
    .session-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .session-info {
      font-size: 14px;
      color: #666;
    }
    .participant-card {
      page-break-inside: avoid;
      margin-bottom: 30px;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background: #f9fafb;
    }
    .participant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .participant-name {
      font-size: 18px;
      font-weight: bold;
      color: #111;
    }
    .participant-info {
      font-size: 12px;
      color: #666;
      display: flex;
      gap: 15px;
    }
    .quiz-score {
      font-size: 16px;
      font-weight: bold;
      color: #6366f1;
      background: white;
      padding: 5px 15px;
      border-radius: 20px;
      border: 2px solid #6366f1;
    }
    .quiz-results {
      margin-top: 15px;
    }
    .quiz-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      margin-bottom: 8px;
      border-radius: 6px;
      background: white;
    }
    .quiz-item.score-2 {
      background: #dcfce7;
      border-left: 4px solid #22c55e;
    }
    .quiz-item.score-1 {
      background: #fef3c7;
      border-left: 4px solid #eab308;
    }
    .quiz-item.score-0 {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
    }
    .word-pair {
      flex: 1;
    }
    .word-sv {
      font-weight: bold;
      color: #111;
    }
    .word-en {
      color: #666;
      font-size: 14px;
    }
    .student-answer {
      margin-top: 5px;
      font-size: 13px;
      color: #555;
    }
    .points {
      font-weight: bold;
      padding: 5px 10px;
      border-radius: 4px;
      min-width: 60px;
      text-align: center;
    }
    .points.score-2 {
      background: #22c55e;
      color: white;
    }
    .points.score-1 {
      background: #eab308;
      color: white;
    }
    .points.score-0 {
      background: #ef4444;
      color: white;
    }
    .no-results {
      text-align: center;
      padding: 40px;
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
    <div class="header">
    <div class="logo">SpellSchool</div>
    <div class="session-title">${wordSetTitle} - Quiz Resultat</div>
    <div class="session-info">
      Förfaller: ${new Date(session.due_date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>

  ${participants && participants.length > 0 ? participants.map((participant: any) => {
    const responses = participantResults[participant.id] || []
    const score = participantScores[participant.id] || { score: 0, total: 0 }
    const blocksCount = Array.isArray(participant.selected_blocks) ? participant.selected_blocks.length : 0
    
    return `
      <div class="participant-card">
        <div class="participant-header">
          <div>
            <div class="participant-name">${participant.student_name}</div>
            <div class="participant-info">
              <span>${blocksCount} färgblock</span>
              ${score.total > 0 ? `<span class="quiz-score">Quiz: ${score.score}/${score.total}</span>` : ''}
            </div>
          </div>
        </div>
        ${responses.length > 0 ? `
          <div class="quiz-results">
            ${responses.map((response: any) => {
              const points = response.score === 100 ? 2 : response.score === 50 ? 1 : 0
              return `
                <div class="quiz-item score-${points}">
                  <div class="word-pair">
                    <div class="word-sv">${response.word_sv}</div>
                    <div class="word-en">→ ${response.word_en}</div>
                    <div class="student-answer">Elevsvar: ${response.student_answer || '(tomt)'}</div>
                  </div>
                  <div class="points score-${points}">${points} poäng</div>
                </div>
              `
            }).join('')}
          </div>
        ` : `
          <div class="no-results">Inga quiz-resultat ännu</div>
        `}
      </div>
    `
  }).join('') : `
    <div class="no-results">Inga deltagare i denna session</div>
  `}
</body>
</html>
      `

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="session-${sessionId}-quiz-${new Date().toISOString().split('T')[0]}.html"`
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid export type' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error exporting session data:', error)
    return NextResponse.json(
      { error: 'Failed to export data', details: error.message },
      { status: 500 }
    )
  }
}


