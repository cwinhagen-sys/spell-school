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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Integritetspolicy</h1>
          <p className="text-gray-600">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduktion</h2>
            <p className="text-gray-700 leading-relaxed">
              Välkommen till Spell School. Vi är dedikerade till att skydda din integritet och säkerställa en säker lärmiljö för elever. 
              Denna integritetspolicy förklarar hur vi samlar in, använder och skyddar din personliga information när du använder vår utbildningsplattform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Information vi samlar in</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">För elever:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Användarnamn:</strong> Ett valt användarnamn för kontohantering</li>
                  <li><strong>Klasskod:</strong> Används för att koppla elever till sin klass</li>
                  <li><strong>Ålder:</strong> För att säkerställa ålderslämpligt innehåll</li>
                  <li><strong>Lärframsteg:</strong> Spelresultat, XP-poäng, märken som tjänats in och ordförrådsframsteg</li>
                  <li><strong>Aktivitetsdata:</strong> Spel som spelats, tid spenderad på lärande och prestationsmått</li>
                  <li><strong>Ingen riktig e-post:</strong> Elever använder syntetiska e-postadresser (format: användarnamn.klasskod@local.local) för att skydda integriteten</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">För lärare:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>E-postadress:</strong> För kontoverifiering och kommunikation</li>
                  <li><strong>Namn:</strong> För att personalisera din undervisningsupplevelse</li>
                  <li><strong>Klassinformation:</strong> Klasser du skapar och hanterar</li>
                  <li><strong>Elevframstegsdata:</strong> Sammanställda framstegsrapporter för dina elever</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Hur vi använder din information</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>För att tillhandahålla och förbättra våra utbildningstjänster</li>
              <li>För att spåra elevers lärframsteg och ge feedback</li>
              <li>För att möjliggöra för lärare att övervaka och stödja elevlärande</li>
              <li>För att personalisera lärupplevelsen</li>
              <li>För att säkerställa plattformssäkerhet och förhindra missbruk</li>
              <li>För att kommunicera med lärare om deras konton och klasser</li>
            </ul>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Dataskydd & säkerhet</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi tar datasäkerhet på allvar och implementerar lämpliga tekniska och organisatoriska åtgärder för att skydda din information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>All data krypteras under överföring med HTTPS</li>
              <li>Elevkonton använder syntetiska e-postadresser för att skydda integriteten</li>
              <li>Tillgång till elevdata är begränsad till auktoriserade lärare och administratörer</li>
              <li>Vi använder säkra autentiseringsmetoder (lösenordshashning, OAuth)</li>
              <li>Regelbundna säkerhetsrevisioner och uppdateringar</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Barns integritet (COPPA/GDPR)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Spell School är designad för utbildningsbruk och följer integritetsregler för barn:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Vi samlar inte in riktiga e-postadresser från elever</li>
              <li>Elevdata är endast tillgänglig för deras auktoriserade lärare</li>
              <li>Vi delar inte elevdata med tredje part för marknadsföringssyften</li>
              <li>Föräldrar och lärare kan begära tillgång till eller radering av elevdata</li>
              <li>Vi följer GDPR-krav för EU-användare</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Datadelning</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi säljer eller hyr inte ut din personliga information. Vi kan dela data endast under följande omständigheter:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-4">
              <li><strong>Med lärare:</strong> Lärare kan se framstegsdata för elever i sina klasser</li>
              <li><strong>Tjänsteleverantörer:</strong> Vi använder betrodda tredjepartstjänster (Supabase, hostingleverantörer) som är bundna av sekretessavtal</li>
              <li><strong>Juridiska krav:</strong> När det krävs enligt lag eller för att skydda våra rättigheter</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dina rättigheter</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Du har rätt att:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Få tillgång till din personliga data</li>
              <li>Begära korrigering av felaktig data</li>
              <li>Begära radering av din data</li>
              <li>Invända mot behandling av din data</li>
              <li>Dataportabilitet (ta emot din data i ett strukturerat format)</li>
            </ul>
            <p className="text-gray-700 mt-4">
              För att utöva dessa rättigheter, vänligen kontakta oss med informationen nedan.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Databevarande</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Vi behåller din data så länge ditt konto är aktivt eller så länge det behövs för att tillhandahålla våra tjänster. 
              När du raderar ditt konto kommer vi att radera eller anonymisera din personliga data inom 30 dagar, 
              utom där vi är skyldiga att behålla den av juridiska skäl.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies & spårning</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi använder nödvändiga cookies och lokal lagring för att upprätthålla din session och komma ihåg dina inställningar. 
              Vi använder inte spårningscookies eller tredjepartsreklam. Du kan kontrollera cookies genom dina webbläsarinställningar.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ändringar av denna policy</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi kan uppdatera denna integritetspolicy från tid till annan. Vi kommer att meddela dig om betydande ändringar 
              genom att publicera den nya policyn på denna sida och uppdatera datumet för "Senast uppdaterad". Ditt fortsatta användande av 
              Spell School efter att ändringar trätt i kraft innebär acceptans av den uppdaterade policyn.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Kontakta oss</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Om du har frågor om denna integritetspolicy eller vill utöva dina rättigheter, vänligen kontakta oss:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>E-post:</strong> [Din kontakt-e-post]</p>
              <p><strong>För lärare:</strong> Kontakta oss via din lärardashboard</p>
              <p><strong>För föräldrar:</strong> Kontakta ditt barns lärare eller skoladministratör</p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200 text-center">
            <Link 
              href="/" 
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              ← Tillbaka till startsidan
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
