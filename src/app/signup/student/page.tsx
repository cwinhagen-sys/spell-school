'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SpellSchoolSignup from '@/components/SpellSchoolSignup'

export default function StudentSignupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>, name: string, email: string, passwordValue: string) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Validate that class code is provided (required for unique email)
      if (!classCode || !classCode.trim()) {
        setMessage('Class code is required to create a student account')
        setLoading(false)
        return
      }
      
      // Create a unique email for the student
      // Format: username.classcode@local.local
      const normalizedUsername = username.toLowerCase().trim()
      const normalizedClassCode = classCode.toUpperCase().trim()
      const email = `${normalizedUsername}.${normalizedClassCode}@local.local`
      
      console.log('Creating student with email:', email)
      
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordValue,
        options: {
          data: {
            username: normalizedUsername,
            age: parseInt(age),
            class_code: normalizedClassCode
          }
        }
      })

      if (error) throw error

      // Create profile with student role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user?.id,
          email: email,
          role: 'student',
          username: normalizedUsername,
          age: parseInt(age),
          class_code: normalizedClassCode
        })

      if (profileError) throw profileError

      // Join the class automatically with the provided class code
      try {
        const { data: joinResult, error: joinError } = await supabase.rpc('join_class_with_code', { 
          p_code: normalizedClassCode 
        })
          
        if (joinError) {
          console.error('Error joining class:', joinError)
          setMessage('Account created successfully! However, there was an issue joining the class. You can try joining manually later.')
        } else if (joinResult === true) {
          setMessage('Account created successfully! You have automatically joined the class.')
        } else {
          setMessage('Account created successfully! However, the class code was invalid. You can try joining manually later.')
        }
      } catch (joinErr) {
        console.error('Error joining class:', joinErr)
        setMessage('Account created successfully! However, there was an issue joining the class. You can try joining manually later.')
      }
      
      // Redirect directly to student dashboard
      setTimeout(() => {
        router.push('/student')
      }, 2000)

    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SpellSchoolSignup
      logoUrl="/images/student-signup.png"
      posterUrl="/images/student-signup.png"
      onEmailSignup={handleEmailSignup}
      loading={loading}
      message={message}
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      age={age}
      setAge={setAge}
      classCode={classCode}
      setClassCode={setClassCode}
      isStudent={true}
      showGoogle={false}
    />
  )
}
