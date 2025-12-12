'use client'

import Link from 'next/link'
import { Shield, Lock, Eye, UserCheck, Mail, Calendar, ArrowLeft, Sparkles } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f2a] via-[#0a0a1a] to-[#050510]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px]" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Privacy Policy
            </h1>
          </div>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Welcome to Spell School. We are dedicated to protecting your privacy and ensuring a safe learning environment for students. 
              This privacy policy explains how we collect, use, and protect your personal information when you use our educational platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Information We Collect</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">For Students:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><strong>Username:</strong> A chosen username for account management</li>
                  <li><strong>Class Code:</strong> Used to connect students to their class</li>
                  <li><strong>Age:</strong> To ensure age-appropriate content</li>
                  <li><strong>Learning Progress:</strong> Game results, XP points, badges earned, and vocabulary progress</li>
                  <li><strong>Activity Data:</strong> Games played, time spent learning, and performance metrics</li>
                  <li><strong>No Real Email:</strong> Students use synthetic email addresses (format: username.classcode@local.local) to protect privacy</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">For Teachers:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><strong>Email Address:</strong> For account verification and communication</li>
                  <li><strong>Name:</strong> To personalize your teaching experience</li>
                  <li><strong>Class Information:</strong> Classes you create and manage</li>
                  <li><strong>Student Progress Data:</strong> Aggregated progress reports for your students</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">How We Use Your Information</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>To provide and improve our educational services</li>
              <li>To track student learning progress and provide feedback</li>
              <li>To enable teachers to monitor and support student learning</li>
              <li>To personalize the learning experience</li>
              <li>To ensure platform security and prevent misuse</li>
              <li>To communicate with teachers about their accounts and classes</li>
            </ul>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Data Protection & Security</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              We take data security seriously and implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>All data is encrypted in transit using HTTPS</li>
              <li>Student accounts use synthetic email addresses to protect privacy</li>
              <li>Access to student data is restricted to authorized teachers and administrators</li>
              <li>We use secure authentication methods (password hashing, OAuth)</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Children's Privacy (COPPA/GDPR)</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Spell School is designed for educational use and complies with children's privacy regulations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>We do not collect real email addresses from students</li>
              <li>Student data is only accessible to their authorized teachers</li>
              <li>We do not share student data with third parties for marketing purposes</li>
              <li>Parents and teachers can request access to or deletion of student data</li>
              <li>We comply with GDPR requirements for EU users</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Data Sharing</h2>
            <p className="text-gray-300 leading-relaxed">
              We do not sell or rent your personal information. We may share data only under the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mt-4">
              <li><strong>With Teachers:</strong> Teachers can view progress data for students in their classes</li>
              <li><strong>Service Providers:</strong> We use trusted third-party services (Supabase, hosting providers) bound by confidentiality agreements</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
            </ul>
            <p className="text-gray-300 mt-4">
              To exercise these rights, please contact us using the information below.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Data Retention</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide our services. 
              When you delete your account, we will delete or anonymize your personal data within 30 days, 
              except where we are required to retain it for legal reasons.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Cookies & Tracking</h2>
            <p className="text-gray-300 leading-relaxed">
              We use essential cookies and local storage to maintain your session and remember your preferences. 
              We do not use tracking cookies or third-party advertising. You can control cookies through your browser settings.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of significant changes 
              by posting the new policy on this page and updating the "Last updated" date. Your continued use of 
              Spell School after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Contact Us</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have questions about this privacy policy or want to exercise your rights, please contact us:
            </p>
            <div className="space-y-2 text-gray-300">
              <p><strong>For Teachers:</strong> Contact us via your teacher dashboard</p>
              <p><strong>For Parents:</strong> Contact your child's teacher or school administrator</p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-white/10 text-center">
            <Link 
              href="/" 
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
