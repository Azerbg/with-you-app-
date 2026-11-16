import Link from "next/link";

export const metadata = {
  title: "FAQ — Questions fréquentes · WithYou Learning",
  description: "Retrouvez les réponses aux questions les plus fréquentes sur WithYou : cours d'essai, garantie satisfaction, paiements, annulations et plus.",
};

const FAQ_ITEMS = [
  {
    id: "trial-price",
    question: "Le cours d'essai est-il vraiment gratuit ?",
    answer: (
      <>
        <p>
          Non, le cours d'essai n'est pas gratuit — il est proposé à un <strong>tarif préférentiel réduit</strong>.
          L'inscription sur la plateforme, la création de profil et la recherche de tuteurs sont, elles, entièrement gratuites.
        </p>
        <p className="mt-2">
          Ce modèle nous permet de garantir la qualité de nos tuteurs et de vous offrir une vraie séance personnalisée
          de 30 minutes, et non un simple entretien commercial.
        </p>
      </>
    ),
  },
  {
    id: "guarantee",
    question: "Qu'est-ce que la Garantie satisfaction ?",
    answer: (
      <>
        <p>
          Si votre premier cours d'essai ne correspond pas à vos attentes, nous vous offrons un{" "}
          <strong>second cours d'essai avec un autre tuteur de notre équipe, sans frais supplémentaires</strong>.
        </p>
        <p className="mt-3 font-semibold text-[#3d2900]">Conditions :</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>La demande doit être faite dans les <strong>24 heures</strong> suivant la fin de la séance</li>
          <li>Par email à <a href="mailto:withyou@gmail.com" className="text-[#C49200] hover:underline">withyou@gmail.com</a> en précisant le motif d'insatisfaction</li>
          <li>La garantie s'applique <strong>une seule fois</strong> par compte Étudiant</li>
          <li>Le cours d'essai n'est pas remboursable en numéraire (sauf absence du tuteur ou défaillance technique)</li>
        </ul>
      </>
    ),
  },
  {
    id: "refund",
    question: "Dans quel cas puis-je obtenir un remboursement en argent ?",
    answer: (
      <>
        <p>Un remboursement monétaire intégral est garanti dans les cas suivants :</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Absence non signalée du tuteur</li>
          <li>Défaillance technique majeure imputable à la plateforme empêchant le bon déroulement de la séance</li>
          <li>Annulation de votre part plus de 24h avant le début de la séance (séances régulières)</li>
        </ul>
        <p className="mt-2">
          Pour toute demande de remboursement, contactez-nous à{" "}
          <a href="mailto:withyou@gmail.com" className="text-[#C49200] hover:underline">withyou@gmail.com</a>.
        </p>
      </>
    ),
  },
  {
    id: "cancel",
    question: "Quelle est la politique d'annulation ?",
    answer: (
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Annulation plus de 24h avant la séance :</strong> remboursement intégral</li>
        <li><strong>Annulation entre 12h et 24h avant :</strong> crédit plateforme</li>
        <li><strong>Annulation moins de 12h avant :</strong> aucun remboursement</li>
        <li><strong>Annulation par le tuteur :</strong> remboursement intégral automatique</li>
      </ul>
    ),
  },
  {
    id: "change-tutor",
    question: "Puis-je changer de tuteur si je ne suis pas satisfait ?",
    answer: (
      <p>
        Oui. Si votre premier cours d'essai ne vous convient pas, la Garantie satisfaction vous permet de réserver
        un nouveau cours d'essai avec un autre tuteur sans frais supplémentaires (sur demande dans les 24h).
        Pour les séances régulières, vous êtes libre de choisir un nouveau tuteur à tout moment depuis la section
        « Trouver un tuteur ».
      </p>
    ),
  },
  {
    id: "certif",
    question: "Proposez-vous des cours de préparation aux examens officiels ?",
    answer: (
      <>
        <p>Oui. Nos tuteurs sont sélectionnés pour accompagner les apprenants sur :</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Français :</strong> TCF, TEF, DELF / DALF</li>
          <li><strong>Anglais :</strong> IELTS, TOEFL iBT, TOEIC, Cambridge (B2 First, C1 Advanced, C2 Proficiency)</li>
          <li>Anglais professionnel (réunions, présentations, emails)</li>
          <li>Conversation quotidienne et aisance à l'oral</li>
        </ul>
        <p className="mt-2">
          Lors de votre inscription, précisez votre objectif (préparation examen, professionnel, conversation…)
          et nous vous proposerons les tuteurs les plus adaptés.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    question: "Quels moyens de paiement sont acceptés ?",
    answer: (
      <p>
        Nous acceptons les cartes bancaires (Visa, Mastercard) via Stripe, ainsi que PayPal.
        Tous les paiements sont sécurisés et chiffrés. Aucune information bancaire n'est stockée
        directement sur nos serveurs.
      </p>
    ),
  },
  {
    id: "inscription",
    question: "L'inscription est-elle gratuite ?",
    answer: (
      <p>
        Oui, l'inscription, la création de profil, le test de placement et la recherche de tuteurs sont
        entièrement gratuits. Vous ne payez qu'au moment de réserver une séance.
      </p>
    ),
  },
  {
    id: "how-it-works",
    question: "Comment se déroule une séance ?",
    answer: (
      <>
        <p>Une séance WithYou se déroule en 3 étapes :</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Vous réservez une créneaux avec votre tuteur et effectuez le paiement</li>
          <li>Au moment de la séance, vous rejoignez la salle de classe virtuelle directement depuis la plateforme (vidéo, audio, tableau blanc interactif, chat)</li>
          <li>Après la séance, vous pouvez laisser un avis et planifier la prochaine séance</li>
        </ol>
      </>
    ),
  },
  {
    id: "contact",
    question: "Comment contacter le support ?",
    answer: (
      <p>
        Par email à{" "}
        <a href="mailto:withyou@gmail.com" className="text-[#C49200] hover:underline">withyou@gmail.com</a>.
        Nous répondons généralement sous 24h ouvrées.
      </p>
    ),
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#fdfaf4]">
      {/* Header */}
      <header className="bg-[#3d2900] px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo-icon.svg" alt="" className="h-9 w-auto brightness-0 invert" aria-hidden="true" />
          <span className="text-[15px] font-black tracking-tight leading-none">
            <span className="text-white">With</span><span className="text-[#F5C400]">You</span>
          </span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#3d2900] mb-2">Questions fréquentes</h1>
          <p className="text-gray-500 text-sm">
            Tout ce que vous devez savoir avant de commencer. Une autre question ?{" "}
            <a href="mailto:withyou@gmail.com" className="text-[#C49200] hover:underline">Écrivez-nous</a>.
          </p>
        </div>

        {/* Guarantee highlight */}
        <div className="bg-[#FFF3B0] border border-[#F5C400]/50 rounded-2xl px-6 py-5 mb-10 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[#F5C400] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-[#5C3D00]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#3d2900] text-sm mb-1">Garantie satisfaction — Zéro risque de tomber sur le mauvais professeur</p>
            <p className="text-[#5C3D00] text-sm leading-relaxed">
              Si votre premier cours d'essai ne vous convient pas, nous vous offrons un second cours avec un autre tuteur,
              sans frais supplémentaires — sur simple demande dans les 24h suivant la séance.
            </p>
            <Link href="/legal/cgu#guarantee" className="text-xs text-[#C49200] hover:underline mt-1 inline-block">
              Voir les conditions complètes →
            </Link>
          </div>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details key={item.id} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-semibold text-[#3d2900] hover:bg-[#FFFBEA] transition-colors">
                {item.question}
                <svg className="w-5 h-5 text-[#C49200] flex-shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-5 pt-1 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                {item.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/legal/cgu" className="text-[#C49200] hover:underline">Conditions Générales d'Utilisation →</Link>
          <Link href="/legal/privacy" className="text-[#C49200] hover:underline">Politique de confidentialité →</Link>
          <Link href="/" className="text-gray-400 hover:text-gray-600">← Retour à l'accueil</Link>
        </div>
      </main>
    </div>
  );
}
