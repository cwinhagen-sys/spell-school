'use client'

import Link from 'next/link'
import { FileText, Users, Shield, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Användarvillkor</h1>
          <p className="text-gray-600">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduktion</h2>
            <p className="text-gray-700 leading-relaxed">
              Välkommen till Spell School. Dessa användarvillkor ("Villkor") styr din tillgång till och användning av 
              vår utbildningsplattform. Genom att komma åt eller använda Spell School godkänner du att vara bunden av dessa Villkor. 
              Om du inte godkänner dessa Villkor, vänligen använd inte vår tjänst.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Godkännande av villkor</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Genom att skapa ett konto, komma åt eller använda Spell School bekräftar du att du har läst, 
              förstått och godkänner att vara bunden av dessa Villkor och vår integritetspolicy. Om du är en lärare 
              som skapar konton för elever, representerar du att du har fått nödvändigt föräldrasamtycke där det krävs.
            </p>
          </section>

          {/* Account Types */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Kontotyper & ansvar</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Elevkonton</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Elever måste använda lämpliga användarnamn (inget stötande eller olämpligt innehåll)</li>
                  <li>Elever måste hålla sina lösenord säkra och inte dela dem</li>
                  <li>Elever bör använda plattformen endast för utbildningssyften</li>
                  <li>Elever måste följa sin lärares instruktioner angående plattformens användning</li>
                  <li>Elever måste vara respektfulla mot andra användare och inte ägna sig åt trakasserier eller mobbning</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Lärarkonton</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Lärare är ansvariga för att hantera sina klasser och elevkonton</li>
                  <li>Lärare måste säkerställa att de har korrekt auktorisering för att skapa elevkonton</li>
                  <li>Lärare måste följa tillämpliga integritetslagar (GDPR, COPPA) när de hanterar elevdata</li>
                  <li>Lärare är ansvariga för att övervaka elevaktivitet och säkerställa lämplig användning</li>
                  <li>Lärare måste upprätthålla sekretessen för elevinformation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Policy för godtagbar användning</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Du godkänner att använda Spell School endast för lagliga syften och i enlighet med dessa Villkor. 
              Du godkänner att INTE:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Använda plattformen för något olagligt eller obehörigt syfte</li>
              <li>Försöka få obehörig tillgång till konton eller data</li>
              <li>Störa eller förhindra plattformens säkerhet eller funktionalitet</li>
              <li>Använda automatiserade system (robotar, skript) för att komma åt plattformen</li>
              <li>Dela, kopiera eller distribuera innehåll utan auktorisering</li>
              <li>Imitera en annan person eller enhet</li>
              <li>Trakassera, mobba eller skada andra användare</li>
              <li>Ladda upp skadlig kod, virus eller skadligt innehåll</li>
              <li>Reversera konstruera eller försöka extrahera källkod</li>
            </ul>
          </section>

          {/* Educational Content */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Utbildningsinnehåll & immateriella rättigheter</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Allt innehåll på Spell School, inklusive men inte begränsat till spel, ordförrådssamlingar, grafik, 
              logotyper och programvara, är Spell Schools eller dess licensgivares egendom och skyddas av 
              upphovsrätt och andra immateriella rättighetslagar.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Du får använda plattformens innehåll endast för utbildningssyften</li>
              <li>Du får inte kopiera, modifiera, distribuera eller skapa härledda verk utan tillstånd</li>
              <li>Lärare kan skapa ordförrådssamlingar och uppgifter för sina klasser</li>
              <li>Användargenererat innehåll förblir användarens egendom men ger Spell School en licens att använda det</li>
            </ul>
          </section>

          {/* Age Requirements */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ålderskrav</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Spell School är designad för utbildningsbruk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Elever:</strong> Måste övervakas av en lärare eller förälder. Konton skapas av lärare.</li>
              <li><strong>Lärare:</strong> Måste vara minst 18 år gamla och auktoriserade att använda plattformen för utbildningssyften</li>
              <li>Om du är under 18 år får du endast använda Spell School med föräldra- eller lärarövervakning</li>
            </ul>
          </section>

          {/* Privacy & Data */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Integritet & dataskydd</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Din användning av Spell School styrs också av vår integritetspolicy. Genom att använda plattformen samtycker du till:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Insamling och användning av din data enligt beskrivningen i vår integritetspolicy</li>
              <li>Att elevdata är tillgänglig för deras auktoriserade lärare</li>
              <li>Att data lagras säkert och används endast för utbildningssyften</li>
              <li>Efterlevnad av tillämpliga integritetslagar (GDPR, COPPA)</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Vänligen granska vår <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700 underline">integritetspolicy</Link> för detaljerad information.
            </p>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tjänstetillgänglighet</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi strävar efter att tillhandahålla pålitlig service men garanterar inte oavbruten eller felfri tillgång. 
              Spell School kan tillfälligt vara otillgänglig på grund av underhåll, uppdateringar eller oförutsedda omständigheter. 
              Vi förbehåller oss rätten att modifiera, suspendera eller avsluta vilken del av tjänsten som helst när som helst.
            </p>
          </section>

          {/* Account Termination */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Kontouppsägning</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi förbehåller oss rätten att suspendera eller avsluta konton som bryter mot dessa Villkor:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Överträdelse av dessa Villkor eller policy för godtagbar användning</li>
              <li>Bedrägeri, missbruk eller olaglig aktivitet</li>
              <li>Obehöriga åtkomstförsök</li>
              <li>Enligt vårt eget omdöme av vilken anledning som helst som vi anser nödvändig</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Du kan radera ditt konto när som helst genom dina kontoinställningar. Vid uppsägning kommer 
              din tillgång till plattformen att återkallas, och din data kommer att hanteras enligt 
              vår integritetspolicy.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Friskrivningar</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Spell School tillhandahålls "som den är" utan garantier av något slag:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Vi garanterar inte noggrannheten eller fullständigheten av utbildningsinnehåll</li>
              <li>Vi är inte ansvariga för läranderesultat eller akademiska prestationer</li>
              <li>Vi garanterar inte oavbruten eller felfri service</li>
              <li>Vi är inte ansvariga för några indirekta, tillfälliga eller följdskador</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ansvarighetsbegränsning</h2>
            <p className="text-gray-700 leading-relaxed">
              I den utsträckning som tillåts enligt lag ska Spell School och dess operatörer inte vara ansvariga 
              för några direkta, indirekta, tillfälliga, särskilda eller följdskador som uppstår från din användning 
              av plattformen. Vårt totala ansvar ska inte överstiga det belopp du betalade (om något) för att använda tjänsten.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frivillig skadeståndsansvar</h2>
            <p className="text-gray-700 leading-relaxed">
              Du godkänner att skydda och hålla Spell School, dess operatörer och dotterbolag skadefria från 
              alla anspråk, skador, förluster eller utgifter (inklusive rättskostnader) som uppstår från din användning av 
              plattformen, överträdelse av dessa Villkor eller intrång i någon annan parts rättigheter.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ändringar av villkor</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi förbehåller oss rätten att modifiera dessa Villkor när som helst. Vi kommer att meddela användare om betydande 
              ändringar genom att publicera de uppdaterade Villkoren på denna sida och uppdatera datumet för "Senast uppdaterad". 
              Ditt fortsatta användande av Spell School efter att ändringar trätt i kraft innebär acceptans av 
              de uppdaterade Villkoren. Om du inte godkänner ändringarna måste du sluta använda plattformen.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tillämplig lag</h2>
            <p className="text-gray-700 leading-relaxed">
              Dessa Villkor ska styras av och tolkas i enlighet med tillämpliga lagar. 
              Eventuella tvister som uppstår från dessa Villkor eller din användning av Spell School ska lösas 
              genom lämpliga juridiska kanaler.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Delbarhet</h2>
            <p className="text-gray-700 leading-relaxed">
              Om någon bestämmelse i dessa Villkor befinns vara ogiltig eller ogenomförbar ska de återstående 
              bestämmelserna fortsätta i full kraft och verkan.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frågor om dessa villkor?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Om du har frågor om dessa användarvillkor, vänligen kontakta oss:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>E-post:</strong> [Din kontakt-e-post]</p>
              <p><strong>För lärare:</strong> Kontakta oss via din lärardashboard</p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200 text-center space-y-4">
            <div className="flex justify-center gap-6">
              <Link 
                href="/privacy" 
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Integritetspolicy
              </Link>
              <span className="text-gray-400">•</span>
              <Link 
                href="/" 
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Tillbaka till startsidan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
