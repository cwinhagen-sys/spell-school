export interface User {
  id: string
  email: string
  role: 'teacher' | 'student'
  name: string
  created_at: string
}

export interface Homework {
  id: string
  title: string
  description: string
  vocabulary_words: string[]
  due_date: string
  teacher_id: string
  created_at: string
  translations?: { [key: string]: string } // Optional translations for flashcards
}

export interface StudentProgress {
  id: string
  student_id: string
  homework_id: string
  completed: boolean
  score: number
  completed_at?: string
}

export interface VocabularyWord {
  id: string
  word: string
  translation: string
  example_sentence: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GameScore {
  id: string
  student_id: string
  game_type: 'flashcards' | 'matching' | 'typing' | 'roulette' | 'story_gap' | 'story' | 'connect' | 'match' | 'choice' | 'translate' | 'quiz'
  score: number
  time_taken: number
  played_at: string
}


