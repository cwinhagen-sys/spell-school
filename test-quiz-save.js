// Test script to check if quiz results can be saved
// Run this in browser console on your site

async function testQuizSave() {
  try {
    console.log('Testing quiz save...')
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('User error:', userError)
      return
    }
    if (!user) {
      console.error('No user found')
      return
    }
    
    console.log('User found:', user.id)
    
    // Try to save a test quiz result
    const testResult = {
      student_id: user.id,
      word_set_id: null, // Try with null first
      homework_id: null,
      last_quiz_score: 5,
      last_quiz_at: new Date().toISOString(),
      last_quiz_total: 10,
      last_game_type: 'quiz',
      total_points: 5,
      games_played: 1
    }
    
    console.log('Saving test result:', testResult)
    
    const { data, error } = await supabase
      .from('student_progress')
      .insert(testResult)
      .select()
    
    if (error) {
      console.error('Save error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('Success! Saved:', data)
    }
    
    // Now try to read it back
    const { data: readData, error: readError } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', user.id)
      .not('last_quiz_score', 'is', null)
    
    if (readError) {
      console.error('Read error:', readError)
    } else {
      console.log('Read back results:', readData)
    }
    
  } catch (err) {
    console.error('Test failed:', err)
  }
}

// Run the test
testQuizSave()














