'use client'

import Link from 'next/link'

export default function SignupPage() {

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to Spell School!</h1>
          <p className="text-lg text-gray-300">Choose your path to magical learning</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Student Option */}
          <Link href="/signup/student">
            <div
              className="p-8 rounded-2xl border cursor-pointer transition-all duration-300 border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102"
            >
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600 overflow-hidden">
                <img 
                  src="/assets/wizard/wizard_novice.png" 
                  alt="Apprentice Wizard" 
                  className="w-28 h-28 object-cover rounded-full"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))',
                    maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                  }}
                />
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
          </Link>

          {/* Teacher Option */}
          <Link href="/signup/teacher">
            <div
              className="p-8 rounded-2xl border cursor-pointer transition-all duration-300 border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102"
            >
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600 overflow-hidden">
                <img 
                  src="/assets/wizard/wizard_powerful.png" 
                  alt="Master Wizard" 
                  className="w-28 h-28 object-cover rounded-full"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))',
                    maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                  }}
                />
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
          </Link>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}