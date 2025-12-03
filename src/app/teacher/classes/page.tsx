'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, X, Trash2, Plus, Users, Check, ArrowRight, RefreshCw, GripVertical, Sparkles, UserMinus, Key } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { canCreateClass, canAddStudentsToClass } from '@/lib/subscription'
import DeleteStudentModal from '@/components/DeleteStudentModal'

type ClassRow = {
  id: string
  teacher_id: string
  name: string
  created_at: string
}

type ProfileRow = {
  id: string
  email: string
  username: string | null
  displayName: string
}

interface StudentData {
  username: string
  password: string
}

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null)
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedClassStudents, setSelectedClassStudents] = useState<ProfileRow[]>([])
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [classToDelete, setClassToDelete] = useState<ClassRow | null>(null)
  
  // Create class modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassStudents, setNewClassStudents] = useState<StudentData[]>([{ username: '', password: '' }])
  const [pasteText, setPasteText] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)
  const bottomButtonRef = useRef<HTMLDivElement>(null)
  
  // Move student modal states
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [studentToMove, setStudentToMove] = useState<ProfileRow | null>(null)
  const [targetClassId, setTargetClassId] = useState<string>('')
  
  // Delete student modal states
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<ProfileRow | null>(null)
  
  // Bulk password reset states
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [showBulkPasswordModal, setShowBulkPasswordModal] = useState(false)
  const [bulkPassword, setBulkPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  
  // Bulk delete states
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [deletingStudents, setDeletingStudents] = useState(false)
  
  // Drag and drop states
  const [draggedStudent, setDraggedStudent] = useState<ProfileRow | null>(null)
  const [dragOverClass, setDragOverClass] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'teacher') { window.location.href = '/student'; return }
      await fetchClasses()
      setLoading(false)
    }
    init()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, teacher_id, name, created_at')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClasses(data || [])
    } catch (e) {
      console.error('Failed to load classes:', e)
      setMessage({ type: 'error', text: 'Kunde inte ladda klasser' })
    }
  }
  
  // Get unassigned students (students without active class)
  const getUnassignedStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
      
      if (!teacherClasses || teacherClasses.length === 0) return []
      
      const classIds = teacherClasses.map(c => c.id)
      
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id, class_id')
        .in('class_id', classIds)
        .is('deleted_at', null)
      
      const activeStudentIds = new Set((classStudents || []).map(cs => cs.student_id))
      
      const { data: deletedClassStudents } = await supabase
        .from('class_students')
        .select('student_id, class_id, deleted_at')
        .in('class_id', classIds)
        .not('deleted_at', 'is', null)
      
      const unassignedStudentIds = new Set<string>()
      if (deletedClassStudents) {
        for (const cs of deletedClassStudents) {
          if (!activeStudentIds.has(cs.student_id)) {
            unassignedStudentIds.add(cs.student_id)
          }
        }
      }
      
      if (unassignedStudentIds.size === 0) return []
      
      const studentIdsArray = Array.from(unassignedStudentIds)
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username, name, deleted_at, role')
        .in('id', studentIdsArray)
        .eq('role', 'student')
        .is('deleted_at', null)
      
      if (profilesError && profilesError.message) {
        console.error('Error fetching profiles:', profilesError)
        return []
      }
      
      const activeProfiles = (profiles || []).filter(p => p.deleted_at === null || p.deleted_at === undefined)
      
      return activeProfiles.map(profile => {
        const username = profile.username || profile.name
        const displayName = username || profile.email.split('.')[0] || profile.email
        
        return {
          id: profile.id,
          email: profile.email,
          username: username,
          displayName: displayName
        }
      })
    } catch (e) {
      console.error('Error fetching unassigned students:', e)
      return []
    }
  }

  const addStudentRow = () => {
    setNewClassStudents([...newClassStudents, { username: '', password: '' }])
  }

  const removeStudentRow = (index: number) => {
    if (newClassStudents.length > 1) {
      setNewClassStudents(newClassStudents.filter((_, i) => i !== index))
    }
  }

  const updateStudent = (index: number, field: keyof StudentData, value: string) => {
    const updated = [...newClassStudents]
    updated[index][field] = value
    setNewClassStudents(updated)
  }

  const handlePasteStudents = () => {
    if (!pasteText.trim()) {
      setMessage({ type: 'error', text: 'Klistra in elevdata först' })
      return
    }

    try {
      const lines = pasteText.split('\n').filter(line => line.trim())
      const parsedStudents: StudentData[] = []

      lines.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) return

        let parts: string[] = []
        if (trimmed.includes('\t')) {
          parts = trimmed.split('\t').map(p => p.trim())
        } else if (trimmed.includes(',')) {
          parts = trimmed.split(',').map(p => p.trim())
        } else {
          parts = [trimmed, '']
        }

        if (parts.length >= 1 && parts[0]) {
          parsedStudents.push({
            username: parts[0],
            password: parts[1] || `${parts[0]}123`
          })
        }
      })

      if (parsedStudents.length === 0) {
        setMessage({ type: 'error', text: 'Ingen giltig elevdata hittades. Format: användarnamn,lösenord (en per rad)' })
        return
      }

      setNewClassStudents([...newClassStudents, ...parsedStudents])
      setPasteText('')
      setMessage({ type: 'success', text: `Lade till ${parsedStudents.length} elev(er) från inklistrad text` })
      
      setTimeout(() => {
        bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    } catch (error: any) {
      setMessage({ type: 'error', text: `Fel vid parsning: ${error.message}` })
    }
  }

  const moveStudent = async (student?: ProfileRow, targetClass?: string) => {
    const studentToMoveLocal = student || studentToMove
    const targetClassIdLocal = targetClass || targetClassId
    
    if (!studentToMoveLocal || !targetClassIdLocal) {
      setMessage({ type: 'error', text: 'Välj en klass att flytta eleven till' })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Inte autentiserad' })
        return
      }

      const { data: targetClassData, error: classError } = await supabase
        .from('classes')
        .select('id, teacher_id')
        .eq('id', targetClassIdLocal)
        .eq('teacher_id', user.id)
        .single()

      if (classError || !targetClassData) {
        setMessage({ type: 'error', text: 'Ogiltig klass' })
        return
      }

      if (selectedClassId && selectedClassId !== 'unassigned') {
        const { error: removeError } = await supabase
          .from('class_students')
          .update({ deleted_at: new Date().toISOString() })
          .match({ class_id: selectedClassId, student_id: studentToMoveLocal.id })

        if (removeError) throw removeError
      }

      const { data: existing, error: checkError } = await supabase
        .from('class_students')
        .select('class_id, student_id, deleted_at')
        .eq('class_id', targetClassIdLocal)
        .eq('student_id', studentToMoveLocal.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existing) {
        const { error: updateError } = await supabase
          .from('class_students')
          .update({ deleted_at: null })
          .eq('class_id', targetClassIdLocal)
          .eq('student_id', studentToMoveLocal.id)

        if (updateError) throw updateError
      } else {
        const { error: addError } = await supabase
          .from('class_students')
          .insert({
            class_id: targetClassIdLocal,
            student_id: studentToMoveLocal.id
          })

        if (addError) throw addError
      }

      setMessage({ type: 'success', text: `${studentToMoveLocal.displayName} har flyttats till ny klass` })
      setShowMoveModal(false)
      if (!student && !targetClass) {
        setStudentToMove(null)
        setTargetClassId('')
      }
      
      if (selectedClassId === 'unassigned') {
        const remainingStudents = selectedClassStudents.filter(s => s.id !== studentToMoveLocal.id)
        setSelectedClassStudents(remainingStudents)
      } else if (selectedClassId) {
        await fetchClassStudents(selectedClassId)
      }
    } catch (error: any) {
      console.error('Error moving student:', error)
      setMessage({ type: 'error', text: error.message || 'Kunde inte flytta eleven' })
    }
  }

  const openMoveModal = (student: ProfileRow) => {
    setStudentToMove(student)
    setTargetClassId('')
    setShowMoveModal(true)
  }

  const createClassWithStudents = async () => {
    if (!newClassName.trim()) {
      setMessage({ type: 'error', text: 'Klassnamn krävs' })
      return
    }

    setCreatingClass(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Inte autentiserad' })
        return
      }

      const canCreate = await canCreateClass(user.id, classes.length)
      if (!canCreate) {
        setMessage({ 
          type: 'error', 
          text: 'Du har nått maxgränsen för klasser på din plan. Uppgradera för fler klasser.' 
        })
        setCreatingClass(false)
        return
      }

      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({ name: newClassName.trim(), teacher_id: user.id })
        .select()
        .single()

      if (classError) throw classError

      const validStudents = newClassStudents.filter(s => s.username.trim() && s.password.trim())
      if (validStudents.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setMessage({ type: 'error', text: 'Inte autentiserad' })
          return
        }

        const response = await fetch('/api/teacher/create-students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            classId: newClass.id,
            students: validStudents.map(student => ({
              username: student.username.trim(),
              password: student.password
            }))
          })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || 'Kunde inte skapa elever')
        }
      }

      setMessage({ type: 'success', text: `Klass "${newClassName}" skapad${validStudents.length > 0 ? ` med ${validStudents.length} elev(er)` : ''}!` })
      setNewClassName('')
      setNewClassStudents([{ username: '', password: '' }])
      setShowCreateModal(false)
      setPasteText('')
      await fetchClasses()
      setSelectedClassId(newClass.id)
      await fetchClassStudents(newClass.id)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte skapa klass' })
    } finally {
      setCreatingClass(false)
    }
  }

  const confirmDeleteClass = (classToDelete: ClassRow) => {
    setClassToDelete(classToDelete)
    setShowDeleteWarning(true)
  }

  const deleteClass = async () => {
    if (!classToDelete) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classToDelete.id)
        .is('deleted_at', null)
      
      if (classStudents && classStudents.length > 0) {
        await supabase
          .from('class_students')
          .update({ deleted_at: new Date().toISOString() })
          .eq('class_id', classToDelete.id)
          .is('deleted_at', null)
      }
      
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', classToDelete.id)
        .eq('teacher_id', user.id)
      if (error) throw error
      
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId(null)
        setSelectedClassStudents([])
      }
      
      fetchClasses()
      setMessage({ 
        type: 'success', 
        text: `Klass "${classToDelete.name}" har raderats. ${classStudents?.length || 0} elev(er) flyttades till Otilldelade.` 
      })
    } catch {
      setMessage({ type: 'error', text: 'Kunde inte radera klass' })
    } finally {
      setShowDeleteWarning(false)
      setClassToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteWarning(false)
    setClassToDelete(null)
  }

  const openClass = async (id: string) => {
    setSelectedClassId(id)
    setMessage(null)
    setSelectedStudents(new Set())
    if (id === 'unassigned') {
      const unassignedStudents = await getUnassignedStudents()
      setSelectedClassStudents(unassignedStudents)
    } else {
      await fetchClassStudents(id)
    }
  }

  const fetchClassStudents = async (classId: string) => {
    try {
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classId)
        .is('deleted_at', null)
      
      if (classError) throw classError
      
      if (!classStudents || classStudents.length === 0) {
        setSelectedClassStudents([])
        return
      }
      
      const studentIds = classStudents.map(cs => cs.student_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds)
        .eq('role', 'student')
        .is('deleted_at', null)
      
      if (profilesError) throw profilesError
      
      const students: ProfileRow[] = (profiles || []).map(profile => {
        const username = profile.username || profile.name || profile.user_name
        const displayName = username || profile.email.split('.')[0] || profile.email
        
        return {
          id: profile.id,
          email: profile.email,
          username: username,
          displayName: displayName
        }
      })
      
      setSelectedClassStudents(students)
    } catch (e: any) {
      console.error('Failed to load students', e)
      setMessage({ type: 'error', text: `Kunde inte ladda elever: ${e.message || ''}` })
      setSelectedClassStudents([])
    }
  }

  const handleDeleteStudentClick = (student: ProfileRow) => {
    setStudentToDelete(student)
    setShowDeleteStudentModal(true)
  }

  const removeStudent = async () => {
    if (!selectedClassId || !studentToDelete) return
    
    const action = selectedClassId === 'unassigned' ? 'delete_student' : 'remove_from_class'
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad' })
        return
      }

      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: action,
          studentId: studentToDelete.id,
          studentEmail: studentToDelete.email,
          classId: selectedClassId === 'unassigned' ? null : selectedClassId
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (action === 'delete_student') {
          setMessage({ type: 'success', text: 'Elevkonto raderat' })
          const remainingStudents = selectedClassStudents.filter(s => s.id !== studentToDelete.id)
          setSelectedClassStudents(remainingStudents)
        } else {
          setMessage({ type: 'success', text: 'Elev borttagen från klass' })
          await fetchClassStudents(selectedClassId)
        }
        
        setShowDeleteStudentModal(false)
        setStudentToDelete(null)
        setSelectedStudents(new Set())
      } else {
        setMessage({ type: 'error', text: data.error || 'Kunde inte ta bort elev' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Kunde inte ta bort elev' })
    }
  }
  
  const handleBulkPasswordReset = async () => {
    if (selectedStudents.size === 0 || !bulkPassword.trim()) {
      setMessage({ type: 'error', text: 'Välj elever och ange ett lösenord' })
      return
    }
    
    if (bulkPassword.length < 6) {
      setMessage({ type: 'error', text: 'Lösenordet måste vara minst 6 tecken' })
      return
    }
    
    setResettingPassword(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad' })
        return
      }
      
      const response = await fetch('/api/teacher/bulk-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          newPassword: bulkPassword
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Lösenord återställt för ${selectedStudents.size} elev(er)` })
        setShowBulkPasswordModal(false)
        setBulkPassword('')
        setSelectedStudents(new Set())
      } else {
        setMessage({ type: 'error', text: data.error || 'Kunde inte återställa lösenord' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Kunde inte återställa lösenord' })
    } finally {
      setResettingPassword(false)
    }
  }
  
  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents)
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId)
    } else {
      newSelection.add(studentId)
    }
    setSelectedStudents(newSelection)
  }
  
  const toggleSelectAll = () => {
    if (selectedStudents.size === selectedClassStudents.length) {
      setSelectedStudents(new Set())
    } else {
      const allIds = new Set(selectedClassStudents.map(s => s.id))
      setSelectedStudents(allIds)
    }
  }
  
  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) return
    
    setDeletingStudents(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad' })
        return
      }
      
      const studentIds = Array.from(selectedStudents)
      const deletePromises = studentIds.map(async (studentId) => {
        const student = selectedClassStudents.find(s => s.id === studentId)
        if (!student) return { success: false, studentId, error: 'Elev hittades inte' }
        
        try {
          const response = await fetch('/api/teacher/students', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              action: 'delete_student',
              studentId: student.id,
              studentEmail: student.email,
              classId: selectedClassId === 'unassigned' ? null : selectedClassId
            })
          })
          
          const data = await response.json()
          
          if (response.ok) {
            return { success: true, studentId }
          } else {
            return { success: false, studentId, error: data.error || 'Okänt fel' }
          }
        } catch (error: any) {
          return { success: false, studentId, error: error.message || 'Nätverksfel' }
        }
      })
      
      const results = await Promise.all(deletePromises)
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success)
      const deletedStudentIds = results.filter(r => r.success).map(r => r.studentId)
      
      if (successful > 0) {
        const remainingStudents = selectedClassStudents.filter(
          student => !deletedStudentIds.includes(student.id)
        )
        setSelectedClassStudents(remainingStudents)
        
        if (failed.length > 0) {
          setMessage({ type: 'warning', text: `Raderade ${successful} konton. ${failed.length} misslyckades.` })
        } else {
          setMessage({ type: 'success', text: `Raderade ${successful} elevkonto(n)` })
        }
        
        setShowBulkDeleteModal(false)
        setSelectedStudents(new Set())
      } else {
        setMessage({ type: 'error', text: 'Kunde inte radera elevkonton' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Kunde inte radera elevkonton' })
    } finally {
      setDeletingStudents(false)
    }
  }
  
  const handleDragStart = (student: ProfileRow) => {
    setDraggedStudent(student)
  }
  
  const handleDragOver = (e: React.DragEvent, classId: string | 'unassigned') => {
    e.preventDefault()
    setDragOverClass(classId)
  }
  
  const handleDragLeave = () => {
    setDragOverClass(null)
  }
  
  const handleDrop = async (e: React.DragEvent, targetClassId: string | 'unassigned') => {
    e.preventDefault()
    setDragOverClass(null)
    
    if (!draggedStudent) return
    
    if (targetClassId === 'unassigned') {
      const tempStudent = draggedStudent
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setMessage({ type: 'error', text: 'Inte autentiserad' })
          setDraggedStudent(null)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setDraggedStudent(null)
          return
        }

        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id)
          .is('deleted_at', null)

        if (!teacherClasses || teacherClasses.length === 0) {
          setMessage({ type: 'error', text: 'Inga klasser hittades' })
          setDraggedStudent(null)
          return
        }

        const classIds = teacherClasses.map(c => c.id)

        const { data: classStudents } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', tempStudent.id)
          .in('class_id', classIds)
          .is('deleted_at', null)
          .limit(1)

        if (!classStudents || classStudents.length === 0) {
          setMessage({ type: 'error', text: 'Eleven hittades inte i någon klass' })
          setDraggedStudent(null)
          return
        }

        const studentClassId = classStudents[0].class_id

        const response = await fetch('/api/teacher/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'remove_from_class',
            studentId: tempStudent.id,
            studentEmail: tempStudent.email,
            classId: studentClassId
          })
        })

        const data = await response.json()

        if (response.ok) {
          if (selectedClassId === studentClassId) {
            const remainingStudents = selectedClassStudents.filter(s => s.id !== tempStudent.id)
            setSelectedClassStudents(remainingStudents)
          }

          if (selectedClassId === 'unassigned') {
            const studentAlreadyInList = selectedClassStudents.find(s => s.id === tempStudent.id)
            if (!studentAlreadyInList) {
              setSelectedClassStudents([...selectedClassStudents, tempStudent])
            }
          }

          setTimeout(async () => {
            const unassignedStudents = await getUnassignedStudents()
            if (selectedClassId === 'unassigned') {
              setSelectedClassStudents(unassignedStudents)
            }
          }, 500)

          setMessage({ type: 'success', text: `${tempStudent.displayName} flyttades till otilldelade` })
        } else {
          setMessage({ type: 'error', text: data.error || 'Kunde inte flytta eleven' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Kunde inte flytta eleven' })
      }
      
      setDraggedStudent(null)
      return
    }
    
    if (targetClassId !== selectedClassId && targetClassId !== 'unassigned') {
      const tempStudent = draggedStudent
      const tempTargetClassId = targetClassId
      
      await moveStudent(tempStudent, tempTargetClassId)
      
      if (selectedClassId === 'unassigned' || selectedClassId) {
        const remainingStudents = selectedClassStudents.filter(s => s.id !== tempStudent.id)
        setSelectedClassStudents(remainingStudents)
      }
      
      setDraggedStudent(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar klasser...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Hantera elever och klasser</h1>
              <p className="text-gray-400">Organisera elever, återställ lösenord och hantera klasser</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="group relative inline-flex items-center justify-center gap-2"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2 hover:from-amber-400 hover:to-orange-500 transition-all">
              <Plus className="w-5 h-5" />
              Skapa klass
            </span>
          </button>
        </div>
      </motion.div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : message.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : message.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-[#12122a] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Dina klasser
            </h2>
            <div className="space-y-2">
              {/* Unassigned */}
              <div
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedClassId === 'unassigned'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                } ${dragOverClass === 'unassigned' ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#12122a]' : ''}`}
                onClick={() => openClass('unassigned')}
                onDragOver={(e) => handleDragOver(e, 'unassigned')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'unassigned')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-600/50 flex items-center justify-center">
                    <UserMinus className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Otilldelade</div>
                    <div className="text-xs text-gray-500">Elever utan aktiv klass</div>
                  </div>
                </div>
              </div>
              
              {classes.map((c, index) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedClassId === c.id
                      ? 'border-teal-500/50 bg-teal-500/10'
                      : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                  } ${dragOverClass === c.id ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-[#12122a]' : ''}`}
                  onClick={() => openClass(c.id)}
                  onDragOver={(e) => handleDragOver(e, c.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, c.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{c.name}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmDeleteClass(c) }}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                      title="Radera klass"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
              
              {classes.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-500 text-sm">Inga klasser ännu</p>
                  <p className="text-gray-600 text-xs mt-1">Klicka "Skapa klass" för att börja</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Class Details */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-[#12122a] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {selectedClassId === 'unassigned' 
                  ? 'Otilldelade elever' 
                  : selectedClassId 
                  ? `Elever i ${classes.find(c => c.id === selectedClassId)?.name || 'klass'}`
                  : 'Välj en klass'}
              </h2>
              {selectedClassId && selectedClassId !== 'unassigned' && selectedClassStudents.length > 0 && (
                <Link
                  href={`/teacher/add-students?class=${selectedClassId}`}
                  className="text-sm text-amber-500 hover:text-amber-400 font-medium"
                >
                  Lägg till elever
                </Link>
              )}
            </div>
            
            {/* Bulk actions bar */}
            {selectedClassId && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedClassStudents.length > 0 && selectedStudents.size === selectedClassStudents.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-amber-500 bg-white/10 border-white/20 rounded focus:ring-amber-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-400">
                    {selectedStudents.size > 0 
                      ? `${selectedStudents.size} av ${selectedClassStudents.length} valda`
                      : 'Markera alla'}
                  </span>
                </div>
                {selectedStudents.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowBulkPasswordModal(true)}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Återställ lösenord
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Radera konton
                    </button>
                    <button
                      onClick={() => setSelectedStudents(new Set())}
                      className="px-3 py-1.5 bg-white/10 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                    >
                      Rensa
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {!selectedClassId ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-500" />
                </div>
                <p className="text-gray-400">Välj en klass för att se elever</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedClassStudents.map((s, index) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    draggable
                    onDragStart={() => handleDragStart(s)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-move ${
                      selectedStudents.has(s.id) 
                        ? 'bg-amber-500/10 border-amber-500/30' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(s.id)}
                        onChange={() => toggleStudentSelection(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-amber-500 bg-white/10 border-white/20 rounded focus:ring-amber-500 focus:ring-offset-0"
                      />
                      <GripVertical className="w-4 h-4 text-gray-600" />
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {s.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{s.displayName}</div>
                        {(!/@local\.local$/i.test(s.email)) && (
                          <div className="text-gray-500 text-xs truncate">{s.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {selectedClassId !== 'unassigned' && (
                        <>
                          <button 
                            onClick={() => openMoveModal(s)} 
                            className="p-2 text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
                            title="Flytta till annan klass"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteStudentClick(s)} 
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Ta bort elev"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
                {selectedClassStudents.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-500 text-sm">
                      {selectedClassId === 'unassigned' 
                        ? 'Inga otilldelade elever' 
                        : 'Inga elever i denna klass'}
                    </p>
                    {selectedClassId && selectedClassId !== 'unassigned' && (
                      <Link
                        href={`/teacher/add-students?class=${selectedClassId}`}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-500/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Lägg till elever
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Class Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Skapa ny klass</h2>
                        <p className="text-sm text-gray-500">Ge klassen ett namn</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewClassName('')
                        setNewClassStudents([{ username: '', password: '' }])
                        setPasteText('')
                      }}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Class Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Klassnamn *
                    </label>
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="t.ex. 5A, Engelska A, etc."
                      className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Du kan lägga till elever efter att klassen har skapats
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewClassName('')
                        setNewClassStudents([{ username: '', password: '' }])
                        setPasteText('')
                      }}
                      className="flex-1 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={createClassWithStudents}
                      disabled={creatingClass || !newClassName.trim()}
                      className="flex-1 px-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
                    >
                      {creatingClass ? 'Skapar...' : 'Skapa klass'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Warning Modal */}
      <AnimatePresence>
        {showDeleteWarning && classToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Radera klass</h3>
                    <p className="text-sm text-gray-400">Detta kan inte ångras</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">
                    Är du säker på att du vill radera <strong className="text-white">"{classToDelete.name}"</strong>?
                  </p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Varning: Detta raderar:
                    </h4>
                    <ul className="text-sm text-red-300/80 space-y-1">
                      <li>• Alla elevers progress och poäng</li>
                      <li>• Alla tilldelningar för klassen</li>
                      <li>• Klassens inställningar</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={deleteClass}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Radera
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Student Modal */}
      <AnimatePresence>
        {showMoveModal && studentToMove && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowMoveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Flytta elev</h3>
                  <button
                    onClick={() => { setShowMoveModal(false); setStudentToMove(null); setTargetClassId('') }}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">
                    Flytta <strong className="text-white">{studentToMove.displayName}</strong> till:
                  </p>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                  >
                    <option value="" className="bg-[#12122a]">Välj klass...</option>
                    {classes.filter(c => c.id !== selectedClassId).map(c => (
                      <option key={c.id} value={c.id} className="bg-[#12122a]">{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowMoveModal(false); setStudentToMove(null); setTargetClassId('') }}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => moveStudent()}
                    disabled={!targetClassId}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Flytta
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Student Modal */}
      {showDeleteStudentModal && studentToDelete && selectedClassId && (
        <DeleteStudentModal
          student={{
            id: studentToDelete.id,
            name: studentToDelete.displayName,
            email: studentToDelete.email,
            class_name: selectedClassId === 'unassigned' ? 'Otilldelade' : classes.find(c => c.id === selectedClassId)?.name || 'Okänd klass'
          }}
          isOpen={showDeleteStudentModal}
          onClose={() => { setShowDeleteStudentModal(false); setStudentToDelete(null) }}
          onConfirm={removeStudent}
          isUnassigned={selectedClassId === 'unassigned'}
        />
      )}

      {/* Bulk Password Reset Modal */}
      <AnimatePresence>
        {showBulkPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkPasswordModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Återställ lösenord för {selectedStudents.size} elev(er)</h3>
                  <button
                    onClick={() => { setShowBulkPasswordModal(false); setBulkPassword('') }}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nytt lösenord (minst 6 tecken)
                  </label>
                  <input
                    type="password"
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    placeholder="Ange nytt lösenord"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Detta lösenord kommer att appliceras på alla {selectedStudents.size} valda elever.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowBulkPasswordModal(false); setBulkPassword('') }}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleBulkPasswordReset}
                    disabled={resettingPassword || !bulkPassword.trim() || bulkPassword.length < 6}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {resettingPassword ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Återställer...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Återställ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Modal */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Radera {selectedStudents.size} elevkonto(n)</h3>
                    <p className="text-sm text-gray-400">Detta kan inte ångras</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">
                    Är du säker på att du vill permanent radera {selectedStudents.size} elevkonto(n)?
                  </p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Detta raderar permanent:
                    </h4>
                    <ul className="text-sm text-red-300/80 space-y-1">
                      <li>• All elevprogress och poäng</li>
                      <li>• Alla spelsessioner och resultat</li>
                      <li>• Alla quiz-resultat</li>
                      <li>• Elevkontot och inloggningsuppgifter</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={deletingStudents}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {deletingStudents ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Raderar...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Radera {selectedStudents.size} konto(n)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
