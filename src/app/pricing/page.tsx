'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Sparkles, Users, BarChart3, Gamepad2, Zap, Crown } from 'lucide-react'
import Link from 'next/link'

const tiers = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfekt för att komma igång',
    color: 'from-gray-400 to-gray-600',
    hoverColor: 'from-gray-500 to-gray-700',
    icon: Sparkles,
    features: [
      { text: '1 klass', included: true },
      { text: '30 elever', included: true },
      { text: '5 ordlistor', included: true },
      { text: 'Alla speltyper', included: true },
      { text: 'Session Mode', included: false },
      { text: 'Progress & Quiz-statistik', included: false },
    ],
    cta: 'Kom igång gratis',
    ctaLink: '/signup/teacher',
    popular: false,
  },
  {
    name: 'Premium',
    monthlyPrice: 29,
    yearlyPrice: 299,
    description: 'För lärare som vill ha mer kontroll',
    color: 'from-teal-500 to-emerald-600',
    hoverColor: 'from-teal-600 to-emerald-700',
    icon: Zap,
    features: [
      { text: '3 klasser', included: true },
      { text: '30 elever per klass', included: true },
      { text: '20 ordlistor', included: true },
      { text: 'Alla speltyper', included: true },
      { text: 'Session Mode', included: true },
      { text: 'Progress & Quiz-statistik', included: false },
    ],
    cta: 'Börja med Premium',
    ctaLink: '/signup/teacher?tier=premium',
    popular: true,
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    yearlyPrice: 499,
    description: 'Fullständig kontroll och insikter',
    color: 'from-amber-500 to-orange-600',
    hoverColor: 'from-amber-600 to-orange-700',
    icon: Crown,
    features: [
      { text: 'Obegränsade klasser', included: true },
      { text: 'Obegränsade elever', included: true },
      { text: 'Obegränsade ordlistor', included: true },
      { text: 'Alla speltyper', included: true },
      { text: 'Session Mode', included: true },
      { text: 'Full access till Progress & Quiz-statistik', included: true },
    ],
    cta: 'Uppgradera till Pro',
    ctaLink: '/signup/teacher?tier=pro',
    popular: false,
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Spell School
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-teal-600 font-medium transition-colors"
              >
                Tillbaka
              </Link>
              <Link
                href="/signup/teacher"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-teal-700 hover:to-emerald-700 transition-all shadow-sm"
              >
                Skapa konto
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            Prenumerationsplaner
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
          >
            Från gratis för att komma igång till Pro med fullständig kontroll och avancerad statistik.
            Alla planer inkluderar alla speltyper och grundläggande funktioner.
          </motion.p>

          {/* Billing Period Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Månadsvis
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Årsvis
            </span>
            {billingPeriod === 'yearly' && (
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                Spara 20%
              </span>
            )}
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => {
            const Icon = tier.icon
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                      Populär
                    </span>
                  </div>
                )}
                <div
                  className={`
                    relative bg-white rounded-2xl border-2 overflow-hidden
                    transition-all duration-500 ease-out
                    hover:scale-[1.08] hover:shadow-2xl hover:-translate-y-2
                    ${tier.popular ? 'border-teal-300 shadow-xl' : 'border-gray-200 shadow-lg'}
                    group cursor-pointer
                  `}
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${tier.color} p-8 text-white relative overflow-hidden transition-all duration-500 group-hover:brightness-110`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-all duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <Icon className="w-10 h-10" />
                        {tier.name === 'Pro' && (
                          <Crown className="w-6 h-6 text-amber-300" />
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                      <p className="text-white/90 text-sm mb-6">{tier.description}</p>
                      <div className="flex items-baseline flex-wrap">
                        {tier.monthlyPrice === 0 ? (
                          <>
                            <span className="text-5xl font-bold">Gratis</span>
                          </>
                        ) : (
                          <>
                            <span className="text-5xl font-bold">
                              {billingPeriod === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice}
                            </span>
                            <span className="text-xl text-white/80 ml-2">kr</span>
                            <span className="text-lg text-white/70 ml-1">
                              /{billingPeriod === 'monthly' ? 'månad' : 'år'}
                            </span>
                            {billingPeriod === 'yearly' && (
                              <div className="w-full mt-2">
                                <span className="text-sm text-white/80 line-through">
                                  {tier.monthlyPrice * 12} kr/år
                                </span>
                                <span className="text-sm text-white/90 ml-2 font-semibold">
                                  ({Math.round((1 - tier.yearlyPrice / (tier.monthlyPrice * 12)) * 100)}% rabatt)
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="p-8">
                    <ul className="space-y-4 mb-8">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          {feature.included ? (
                            <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5 mr-3" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5 mr-3" />
                          )}
                          <span
                            className={
                              feature.included
                                ? 'text-gray-700 font-medium'
                                : 'text-gray-400 line-through'
                            }
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Link
                      href={tier.ctaLink}
                      className={`
                        block w-full text-center py-4 px-6 rounded-xl font-semibold text-lg
                        transition-all duration-300 transform
                        hover:scale-105 hover:shadow-xl hover:-translate-y-1
                        ${
                          tier.popular
                            ? `bg-gradient-to-r ${tier.color} text-white hover:from-teal-600 hover:to-emerald-700`
                            : tier.name === 'Free'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : `bg-gradient-to-r ${tier.color} text-white hover:from-teal-600 hover:to-emerald-700`
                        }
                      `}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-24 max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Jämför funktioner
          </h2>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-50 to-emerald-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Funktion
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      Premium
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { feature: 'Pris (månadsvis)', free: 'Gratis', premium: '79 kr', pro: '129 kr' },
                    { feature: 'Pris (årvis)', free: 'Gratis', premium: '758 kr', pro: '1238 kr' },
                    { feature: 'Antal klasser', free: '1', premium: '3', pro: 'Obegränsat' },
                    { feature: 'Antal elever', free: '30', premium: '30 per klass', pro: 'Obegränsat' },
                    { feature: 'Ordlistor', free: '5', premium: '20', pro: 'Obegränsat' },
                    { feature: 'Speltyper', free: 'Alla', premium: 'Alla', pro: 'Alla' },
                    { feature: 'Session Mode', free: '❌', premium: '✅', pro: '✅' },
                    {
                      feature: 'Progress & Quiz-statistik',
                      free: '❌',
                      premium: '❌',
                      pro: '✅',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.feature}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">{row.free}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">{row.premium}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-24 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Vanliga frågor
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'Kan jag byta plan när som helst?',
                a: 'Ja, du kan uppgradera eller nedgradera din plan när som helst. Ändringar träder i kraft direkt.',
              },
              {
                q: 'Vad händer med mina data om jag avslutar prenumerationen?',
                a: 'Dina data behålls i 30 dagar efter att prenumerationen avslutas. Du kan återaktivera din plan inom denna period för att behålla allt.',
              },
              {
                q: 'Finns det studentbegränsningar i Free-planen?',
                a: 'Free-planen tillåter upp till 30 elever totalt i din klass. Premium och Pro har obegränsade elever.',
              },
              {
                q: 'Vad ingår i Progress & Quiz-statistik?',
                a: 'Pro-planen ger dig detaljerad statistik över elevernas framsteg över tid, accuracy-trender, ordspecifik statistik och möjlighet att exportera data.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-24 text-center"
        >
          <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Redo att börja?</h2>
            <p className="text-xl text-teal-100 mb-8">
              Skapa ditt konto idag och börja använda Spell School gratis.
            </p>
            <Link
              href="/signup/teacher"
              className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all shadow-lg"
            >
              Skapa lärarkonto
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>&copy; {new Date().getFullYear()} Spell School. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

