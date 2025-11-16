'use client'

import Link from 'next/link'
import { Shield, Lock, Eye, UserCheck, Mail, Calendar } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Spell School. We are committed to protecting your privacy and ensuring a safe learning environment for students. 
              This Privacy Policy explains how we collect, use, and protect your personal information when you use our educational platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">For Students:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Username:</strong> A chosen username for account identification</li>
                  <li><strong>Class Code:</strong> Used to associate students with their class</li>
                  <li><strong>Age:</strong> To ensure age-appropriate content</li>
                  <li><strong>Learning Progress:</strong> Game scores, XP points, badges earned, and vocabulary progress</li>
                  <li><strong>Activity Data:</strong> Games played, time spent learning, and performance metrics</li>
                  <li><strong>No Real Email:</strong> Students use synthetic email addresses (format: username.classcode@local.local) to protect privacy</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">For Teachers:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
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
              <UserCheck className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>To provide and improve our educational services</li>
              <li>To track student learning progress and provide feedback</li>
              <li>To enable teachers to monitor and support student learning</li>
              <li>To personalize the learning experience</li>
              <li>To ensure platform security and prevent abuse</li>
              <li>To communicate with teachers about their accounts and classes</li>
            </ul>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Data Protection & Security</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              We take data security seriously and implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>All data is encrypted in transit using HTTPS</li>
              <li>Student accounts use synthetic email addresses to protect privacy</li>
              <li>Access to student data is restricted to authorized teachers and administrators</li>
              <li>We use secure authentication methods (password hashing, OAuth)</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy (COPPA/GDPR)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Spell School is designed for educational use and complies with children's privacy regulations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>We do not collect real email addresses from students</li>
              <li>Student data is only accessible to their authorized teachers</li>
              <li>We do not share student data with third parties for marketing purposes</li>
              <li>Parents and teachers can request access to or deletion of student data</li>
              <li>We comply with GDPR requirements for EU users</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sharing</h2>
            <p className="text-gray-700 leading-relaxed">
              We do not sell or rent your personal information. We may share data only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-4">
              <li><strong>With Teachers:</strong> Teachers can view progress data for students in their classes</li>
              <li><strong>Service Providers:</strong> We use trusted third-party services (Supabase, hosting providers) that are bound by confidentiality agreements</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
            </ul>
            <p className="text-gray-700 mt-4">
              To exercise these rights, please contact us using the information below.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Data Retention</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide our services. 
              When you delete your account, we will delete or anonymize your personal data within 30 days, 
              except where we are required to retain it for legal purposes.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies & Tracking</h2>
            <p className="text-gray-700 leading-relaxed">
              We use essential cookies and local storage to maintain your session and remember your preferences. 
              We do not use tracking cookies or third-party advertising. You can control cookies through your browser settings.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any significant changes 
              by posting the new policy on this page and updating the "Last updated" date. Your continued use of 
              Spell School after changes become effective constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> [Your contact email]</p>
              <p><strong>For Teachers:</strong> Contact us through your teacher dashboard</p>
              <p><strong>For Parents:</strong> Contact your child's teacher or school administrator</p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200 text-center">
            <Link 
              href="/" 
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

