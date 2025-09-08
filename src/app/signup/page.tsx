'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <img src="/assets/wizard/wizard_powerful.png" alt="Wizard" className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to Spell School!</h1>
          <p className="text-lg text-gray-300">Choose your path to magical learning</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Student Option */}
          <div
            className={`p-8 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
              selectedRole === 'student'
                ? 'border-yellow-400 bg-yellow-400/10 shadow-2xl scale-105'
                : 'border-white/20 bg-white/10 hover:bg-white/20 hover:scale-102'
            }`}
            onClick={() => setSelectedRole('student')}
          >
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <img src="/assets/wizard/wizard_novice.png" alt="Apprentice Wizard" className="w-24 h-24" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Student</h3>
              <p className="text-gray-300 text-lg">Learn with interactive games and magical adventures</p>
              <div className="mt-4 text-sm text-gray-400">
                • Play educational games<br/>
                • Earn points and level up<br/>
                • Join your teacher's class
              </div>
            </div>
          </div>

          {/* Teacher Option */}
          <div
            className={`p-8 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
              selectedRole === 'teacher'
                ? 'border-yellow-400 bg-yellow-400/10 shadow-2xl scale-105'
                : 'border-white/20 bg-white/10 hover:bg-white/20 hover:scale-102'
            }`}
            onClick={() => setSelectedRole('teacher')}
          >
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <img src="/assets/wizard/wizard_powerful.png" alt="Master Wizard" className="w-24 h-24" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Teacher</h3>
              <p className="text-gray-300 text-lg">Create assignments and guide your students' journey</p>
              <div className="mt-4 text-sm text-gray-400">
                • Create word sets and assignments<br/>
                • Track student progress<br/>
                • Manage your classes
              </div>
            </div>
          </div>
        </div>

        {selectedRole && (
          <div className="text-center">
            <Link
              href={`/signup/${selectedRole}`}
              className="inline-block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white py-4 px-8 rounded-lg font-bold hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-all duration-200 shadow-2xl hover:shadow-yellow-500/25 text-lg"
            >
              Continue as {selectedRole === 'student' ? 'Student' : 'Teacher'}
            </Link>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link href="/" className="text-yellow-400 hover:text-yellow-300 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}