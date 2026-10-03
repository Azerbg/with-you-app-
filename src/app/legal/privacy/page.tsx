import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — WithYou Learning",
  description: "Politique de confidentialité et protection des données personnelles de WithYou Learning.",
};

export default function PrivacyPage() {
  const lastUpdated = "2 octobre 2026";

  return (
    <div className="min-h-screen bg-[#fdfaf4]">
      {/* Header */}
      <header className="bg-[#3d2900] px-6 py-4">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">
          With<span className="text-[#F5C400]">You</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#3d2900] mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : {lastUpdated}</p>

        <div className="prose prose-stone max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">1. Responsable du traitement</h2>
            <p>
              WithYou Learning, Canada<br />
              Email : <a href="mailto:withyou@gmail.com" className="text-[#F5C400] hover:underline">withyou@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Données d'identité :</strong> prénom, nom, adresse email</li>
              <li><strong>Données de connexion :</strong> mot de passe chiffré, historique de connexion</li>
              <li><strong>Données de profil :</strong> photo, biographie, matières enseignées (Tuteurs), niveau d'études (Étudiants)</li>
              <li><strong>Données de paiement :</strong> traitées directement par Stripe — nous ne stockons aucune donnée bancaire</li>
              <li><strong>Données d'utilisation :</strong> réservations, messages, avis, sessions de cours</li>
              <li><strong>Données techniques :</strong> adresse IP, type de navigateur, logs d'erreurs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">3. Finalités du traitement</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Gérer votre compte et vous authentifier</li>
              <li>Faciliter la mise en relation entre Étudiants et Tuteurs</li>
              <li>Traiter les paiements et gérer les remboursements</li>
              <li>Envoyer des notifications de session (rappels, confirmations)</li>
              <li>Améliorer la qualité de la plateforme</li>
              <li>Assurer la sécurité et prévenir les fraudes</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">4. Partage des données</h2>
            <p>Nous partageons vos données uniquement avec :</p>
            <ul className="list-disc list-inside mt-2 space-y-2">
              <li>
                <strong>Stripe</strong> — traitement des paiements.
                <a href="https://stripe.com/privacy" className="text-[#F5C400] hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  Politique de confidentialité Stripe →
                </a>
              </li>
              <li>
                <strong>Brevo (Sendinblue)</strong> — envoi d'emails transactionnels.
                <a href="https://www.brevo.com/legal/privacypolicy/" className="text-[#F5C400] hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  Politique de confidentialité Brevo →
                </a>
              </li>
              <li>
                <strong>LiveKit</strong> — infrastructure de salles de classe virtuelles.
              </li>
              <li>
                <strong>Sentry</strong> — suivi des erreurs techniques (données anonymisées).
              </li>
              <li>
                <strong>Neon / Vercel</strong> — hébergement de la base de données et de l'application.
              </li>
            </ul>
            <p className="mt-2">
              Nous ne vendons jamais vos données à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">5. Durée de conservation</h2>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Données de compte : conservées pendant la durée d'activité du compte + 2 ans après suppression</li>
              <li>Données de paiement : conservées 5 ans (obligation légale)</li>
              <li>Messages : conservés 1 an après la fin de la relation Étudiant-Tuteur</li>
              <li>Logs techniques : conservés 90 jours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">6. Vos droits (LPRPDE — Canada)</h2>
            <p>Conformément à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE), vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
              <li><strong>Droit de suppression</strong> : demander la suppression de votre compte et de vos données</li>
              <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à :{" "}
              <a href="mailto:withyou@gmail.com" className="text-[#F5C400] hover:underline">withyou@gmail.com</a>.
              Nous répondrons dans un délai de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">7. Cookies</h2>
            <p>
              WithYou utilise des cookies strictement nécessaires au fonctionnement de la plateforme (authentification, sécurité).
              Nous n'utilisons pas de cookies publicitaires ou de tracking tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données :
              chiffrement des mots de passe (bcrypt), connexions HTTPS, authentification à deux facteurs disponible,
              limitation des tentatives de connexion, surveillance des erreurs via Sentry.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">9. Modifications</h2>
            <p>
              Nous nous réservons le droit de modifier cette politique à tout moment. En cas de modification substantielle,
              vous serez informé par email. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">10. Contact</h2>
            <p>
              Pour toute question relative à la protection de vos données :<br />
              <a href="mailto:withyou@gmail.com" className="text-[#F5C400] hover:underline">withyou@gmail.com</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex gap-4 text-sm">
          <Link href="/legal/cgu" className="text-[#F5C400] hover:underline">
            Conditions Générales d'Utilisation →
          </Link>
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            ← Retour à l'accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
