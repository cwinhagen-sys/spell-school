'use client'

import Link from 'next/link'
import { FileText, Users, Shield, AlertTriangle, CheckCircle, BookOpen, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Terms of Service
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
              Welcome to Spell School. These Terms of Service ("Terms") govern your access to and use of 
              our educational platform. By accessing or using Spell School, you agree to be bound by these Terms. 
              If you do not agree to these Terms, please do not use our service.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Acceptance of Terms</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              By creating an account, accessing, or using Spell School, you confirm that you have read, 
              understood, and agree to be bound by these Terms and our Privacy Policy. If you are a teacher 
              creating accounts for students, you represent that you have obtained necessary parental consent where required.
            </p>
          </section>

          {/* Account Types */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Account Types & Responsibilities</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Student Accounts</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li>Students must use appropriate usernames (no offensive or inappropriate content)</li>
                  <li>Students must keep their passwords secure and not share them</li>
                  <li>Students should use the platform only for educational purposes</li>
                  <li>Students must follow their teacher's instructions regarding platform use</li>
                  <li>Students must be respectful of other users and not engage in harassment or bullying</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Teacher Accounts</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li>Teachers are responsible for managing their classes and student accounts</li>
                  <li>Teachers must ensure they have proper authorization to create student accounts</li>
                  <li>Teachers must comply with applicable privacy laws (GDPR, COPPA) when handling student data</li>
                  <li>Teachers are responsible for monitoring student activity and ensuring appropriate use</li>
                  <li>Teachers must maintain confidentiality of student information</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Acceptable Use Policy</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree to use Spell School only for lawful purposes and in accordance with these Terms. 
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Use the platform for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to accounts or data</li>
              <li>Interfere with or disrupt the platform's security or functionality</li>
              <li>Use automated systems (bots, scripts) to access the platform</li>
              <li>Share, copy, or distribute content without authorization</li>
              <li>Impersonate another person or entity</li>
              <li>Harass, bully, or harm other users</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Reverse engineer or attempt to extract source code</li>
            </ul>
          </section>

          {/* Educational Content */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Educational Content & Intellectual Property</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              All content on Spell School, including but not limited to games, vocabulary sets, graphics, 
              logos, and software, is the property of Spell School or its licensors and is protected by 
              copyright and other intellectual property laws.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>You may use platform content only for educational purposes</li>
              <li>You may not copy, modify, distribute, or create derivative works without permission</li>
              <li>Teachers may create vocabulary sets and assignments for their classes</li>
              <li>User-generated content remains the user's property but grants Spell School a license to use it</li>
            </ul>
          </section>

          {/* Age Requirements */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Age Requirements</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Spell School is designed for educational use:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><strong>Students:</strong> Must be supervised by a teacher or parent. Accounts are created by teachers.</li>
              <li><strong>Teachers:</strong> Must be at least 18 years old and authorized to use the platform for educational purposes</li>
              <li>If you are under 18, you may only use Spell School with parental or teacher supervision</li>
            </ul>
          </section>

          {/* Privacy & Data */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Privacy & Data Protection</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Your use of Spell School is also governed by our Privacy Policy. By using the platform, you consent to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Collection and use of your data as described in our Privacy Policy</li>
              <li>Student data being accessible to their authorized teachers</li>
              <li>Data being stored securely and used only for educational purposes</li>
              <li>Compliance with applicable privacy laws (GDPR, COPPA)</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Please review our <Link href="/privacy" className="text-amber-400 hover:text-amber-300 underline">Privacy Policy</Link> for detailed information.
            </p>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Service Availability</h2>
            <p className="text-gray-300 leading-relaxed">
              We strive to provide reliable service but do not guarantee uninterrupted or error-free access. 
              Spell School may be temporarily unavailable due to maintenance, updates, or unforeseen circumstances. 
              We reserve the right to modify, suspend, or terminate any part of the service at any time.
            </p>
          </section>

          {/* Account Termination */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Account Termination</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Violation of these Terms or acceptable use policy</li>
              <li>Fraudulent, abusive, or illegal activity</li>
              <li>Unauthorized access attempts</li>
              <li>At our sole discretion for any reason we deem necessary</li>
            </ul>
            <p className="text-gray-300 mt-4">
              You may delete your account at any time through your account settings. Upon termination, 
              your access to the platform will be revoked, and your data will be handled according to 
              our Privacy Policy.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Disclaimers</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Spell School is provided "as is" without warranties of any kind:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>We do not guarantee the accuracy or completeness of educational content</li>
              <li>We are not responsible for learning outcomes or academic performance</li>
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              To the extent permitted by law, Spell School and its operators shall not be liable 
              for any direct, indirect, incidental, special, or consequential damages arising from your use 
              of the platform. Our total liability shall not exceed the amount you paid (if any) to use the service.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify and hold harmless Spell School, its operators, and affiliates from 
              any claims, damages, losses, or expenses (including legal fees) arising from your use of 
              the platform, violation of these Terms, or infringement of any other party's rights.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of significant 
              changes by posting the updated Terms on this page and updating the "Last updated" date. 
              Your continued use of Spell School after changes take effect constitutes acceptance of 
              the updated Terms. If you do not agree to the changes, you must stop using the platform.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws. 
              Any disputes arising from these Terms or your use of Spell School shall be resolved 
              through appropriate legal channels.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Severability</h2>
            <p className="text-gray-300 leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining 
              provisions shall continue in full force and effect.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-gray-300">
              <p><strong>For Teachers:</strong> Contact us via your teacher dashboard</p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-white/10 text-center space-y-4">
            <div className="flex justify-center gap-6">
              <Link 
                href="/privacy" 
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                href="/" 
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
