import Link from "next/link";

export const metadata = {
  title: "Conditions Générales d'Utilisation — WithYou Learning",
  description: "Conditions générales d'utilisation de la plateforme WithYou Learning.",
};

export default function CGUPage() {
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
        <h1 className="text-3xl font-bold text-[#3d2900] mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : {lastUpdated}</p>

        <div className="prose prose-stone max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">1. Présentation de la plateforme</h2>
            <p>
              WithYou Learning (ci-après « WithYou », « la plateforme » ou « nous ») est une plateforme de mise en relation
              entre apprenants (ci-après « Étudiants ») et enseignants particuliers (ci-après « Tuteurs »), éditée par
              WithYou Learning, dont le siège social est au Canada.
            </p>
            <p className="mt-2">
              Contact : <a href="mailto:withyou@gmail.com" className="text-[#F5C400] hover:underline">withyou@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">2. Acceptation des conditions</h2>
            <p>
              L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez
              pas ces conditions, vous ne devez pas utiliser la plateforme. WithYou se réserve le droit de modifier les
              présentes CGU à tout moment. Les utilisateurs seront informés par email de toute modification substantielle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">3. Inscription et compte utilisateur</h2>
            <p>Pour utiliser WithYou, vous devez :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Être âgé d'au moins 16 ans (ou avoir l'autorisation d'un parent ou tuteur légal)</li>
              <li>Fournir des informations exactes et à jour lors de l'inscription</li>
              <li>Maintenir la confidentialité de vos identifiants de connexion</li>
              <li>Ne pas créer plusieurs comptes</li>
            </ul>
            <p className="mt-2">
              Vous êtes responsable de toute activité effectuée via votre compte. WithYou se réserve le droit de suspendre
              ou supprimer tout compte en cas de violation des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">4. Services proposés</h2>
            <p>
              WithYou permet aux Étudiants de rechercher, contacter et réserver des sessions de cours en ligne avec des Tuteurs.
              Les sessions se déroulent via la salle de classe virtuelle intégrée à la plateforme.
            </p>
            <p className="mt-2">
              WithYou agit exclusivement en tant qu'intermédiaire technique. La relation pédagogique est établie directement
              entre l'Étudiant et le Tuteur. WithYou ne garantit pas les résultats pédagogiques.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">5. Paiements et tarification</h2>
            <p>
              Les paiements sont traités de manière sécurisée via Stripe. En réservant une session, l'Étudiant accepte
              de payer le tarif indiqué par le Tuteur.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Le paiement est débité au moment de la confirmation de réservation</li>
              <li>Les prix sont affichés en dinars tunisiens (TND)</li>
              <li>WithYou perçoit une commission sur chaque transaction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">6. Politique d'annulation et remboursement</h2>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Annulation par l'Étudiant plus de 24h avant :</strong> remboursement intégral</li>
              <li><strong>Annulation par l'Étudiant moins de 24h avant :</strong> aucun remboursement</li>
              <li><strong>Annulation par le Tuteur :</strong> remboursement intégral de l'Étudiant</li>
              <li><strong>Absence non signalée du Tuteur :</strong> remboursement intégral + signalement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">7. Obligations des utilisateurs</h2>
            <p>Il est strictement interdit de :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Partager des coordonnées personnelles (email, téléphone, réseaux sociaux) via la messagerie de la plateforme afin de contourner le système de paiement</li>
              <li>Publier des contenus illicites, offensants ou trompeurs</li>
              <li>Usurper l'identité d'un autre utilisateur</li>
              <li>Utiliser la plateforme à des fins de spam ou de harcèlement</li>
              <li>Tenter de pirater ou perturber le fonctionnement de la plateforme</li>
            </ul>
            <p className="mt-2">
              Toute violation peut entraîner la suspension immédiate du compte sans remboursement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">8. Programme de parrainage</h2>
            <p>
              WithYou propose un programme de parrainage permettant aux utilisateurs d'obtenir des crédits. Ces crédits
              sont non-remboursables, non-transférables et ne peuvent être convertis en argent. WithYou se réserve le
              droit de modifier ou suspendre ce programme à tout moment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">9. Propriété intellectuelle</h2>
            <p>
              Tous les éléments de la plateforme (logo, design, code, contenus) sont la propriété exclusive de WithYou Learning.
              Toute reproduction, distribution ou utilisation commerciale sans autorisation écrite préalable est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">10. Limitation de responsabilité</h2>
            <p>
              WithYou ne saurait être tenu responsable de :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>La qualité pédagogique des sessions dispensées par les Tuteurs</li>
              <li>Les interruptions de service dues à des causes techniques indépendantes de notre volonté</li>
              <li>Les dommages indirects résultant de l'utilisation de la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">11. Droit applicable</h2>
            <p>
              Les présentes CGU sont régies par les lois en vigueur au Canada. Tout litige relatif à leur interprétation
              ou leur exécution sera soumis aux tribunaux compétents canadiens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#3d2900] mb-3">12. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU :<br />
              <a href="mailto:withyou@gmail.com" className="text-[#F5C400] hover:underline">withyou@gmail.com</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex gap-4 text-sm">
          <Link href="/legal/privacy" className="text-[#F5C400] hover:underline">
            Politique de confidentialité →
          </Link>
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            ← Retour à l'accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
