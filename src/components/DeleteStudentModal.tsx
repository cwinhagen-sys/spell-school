'use client'

import { useState } from 'react'
import { AlertTriangle, X, Calendar, Shield, Trash2 } from 'lucide-react'

interface DeleteStudentModalProps {
  student: {
    id: string
    name: string
    email: string
    class_name: string
  }
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isUnassigned?: boolean
}

export default function DeleteStudentModal({
  student,
  isOpen,
  onClose,
  onConfirm,
  isUnassigned = false
}: DeleteStudentModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  if (!isOpen) return null

  const deletionDate = new Date()
  const anonymizationDate = new Date()
  anonymizationDate.setDate(anonymizationDate.getDate() + 30)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error deleting student:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isUnassigned ? 'Permanently Delete Student' : 'Remove Student from Class'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isUnassigned 
                    ? 'This student will be permanently deleted'
                    : 'This student will be removed from the class'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isDeleting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Student Information</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {student.name}</p>
              <p><span className="font-medium">Email:</span> {student.email}</p>
              {!isUnassigned && (
                <p><span className="font-medium">Class:</span> {student.class_name}</p>
              )}
            </div>
          </div>

          {/* What happens */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              What happens when you remove this student?
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              {isUnassigned ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Immediately</p>
                      <p className="text-sm text-gray-600">
                        The student will be removed from the system and can no longer log in. All personal data will be marked for deletion.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">30 days after deletion</p>
                      <p className="text-sm text-gray-600">
                        All personal data will be anonymized or permanently deleted. Anonymized statistics may be retained for analysis.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Estimated date: {anonymizationDate.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Immediately</p>
                      <p className="text-sm text-gray-600">
                        The student will be removed from the class "{student.class_name}". The student can still log in but will no longer appear in the class.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">If the student is not assigned to a new class</p>
                      <p className="text-sm text-gray-600">
                        If the student is not assigned to a new class within 30 days, the student will automatically be anonymized or deleted.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* GDPR Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 mb-1">GDPR and Data Protection</p>
                <p className="text-sm text-gray-600">
                  All deletions are logged for traceability. Personal data is processed according to GDPR and will be anonymized or deleted within 30 days.
                  Anonymized statistics may be retained for analysis but contain no personal data.
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 mb-1">Important to Know</p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  {isUnassigned ? (
                    <>
                      <li>This action cannot be undone after 30 days</li>
                      <li>All personal data will be anonymized or deleted</li>
                      <li>The student will no longer be able to log in</li>
                    </>
                  ) : (
                    <>
                      <li>The student will no longer appear in the class</li>
                      <li>You can always add the student to another class later</li>
                      <li>If the student is not assigned to a new class within 30 days, anonymization will occur automatically</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {isUnassigned ? 'Delete Permanently' : 'Remove from Class'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

