'use client'

import Link from 'next/link'

export default function SignupPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Spell School!</h1>
          <p className="text-lg text-gray-600">Choose your path to magical learning</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Student Option */}
          <Link href="/signup/student">
            <div
              className="p-8 rounded-2xl border cursor-pointer transition-all duration-300 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
            <div className="text-center">
              <div className="w-32 h-32 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-gray-200 overflow-hidden shadow-lg">
                <img 
                  src="/images/student-signup.png" 
                  alt="Student studying" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Student</h3>
              <p className="text-gray-600 text-lg">Learn with interactive games and magical adventures</p>
              <div className="mt-4 text-sm text-gray-500">
                • Play educational games<br/>
                • Earn points and level up<br/>
                • Join your teacher's class
              </div>
            </div>
            </div>
          </Link>

          {/* Teacher Option */}
          <Link href="/signup/teacher">
            <div
              className="p-8 rounded-2xl border cursor-pointer transition-all duration-300 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
            <div className="text-center">
              <div className="w-32 h-32 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-gray-200 overflow-hidden shadow-lg">
                <img 
                  src="/images/teacher-signup.png" 
                  alt="Wizard casting spell" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Teacher</h3>
              <p className="text-gray-600 text-lg">Create assignments and guide your students' journey</p>
              <div className="mt-4 text-sm text-gray-500">
                • Create word sets and assignments<br/>
                • Track student progress<br/>
                • Manage your classes
              </div>
            </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}