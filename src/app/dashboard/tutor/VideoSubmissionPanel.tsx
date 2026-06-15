"use client";

import { useState } from "react";

export default function VideoSubmissionPanel({ languages }: { languages: string[] }) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const langLabel = languages.length > 0 ? languages.join(", ") : "la langue enseignée";

  async function submit() {
    setError("");
    if (mode === "upload" && !file) { setError("Veuillez sélectionner un fichier vidéo."); return; }
    if (mode === "upload" && file && file.size > 50 * 1024 * 1024) { setError("Le fichier dépasse 50 Mo. Utilisez un lien YouTube ou Google Drive."); return; }
    if (mode === "link" && !link.trim()) { setError("Veuillez entrer un lien valide."); return; }

    setUploading(true);
    try {
      let videoUrl: string;

      if (mode === "upload" && file) {
        videoUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        videoUrl = link.trim();
      }

      const res = await fetch("/api/tutors/video-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue. Veuillez réessayer.");
      }
    } catch {
      setError("Une erreur est survenue lors de l'envoi.");
    }
    setUploading(false);
  }

  if (done) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-base font-bold text-green-800">Vidéo envoyée avec succès !</p>
        <p className="text-sm text-green-700 mt-2">
          Notre équipe RH examinera votre vidéo sous 3 à 5 jours ouvrables.<br />
          Vous serez contacté par email pour la suite du processus.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6 space-y-5">
      <div>
        <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
          Etape 2 — Depot de votre video de presentation
        </p>
        <div className="bg-[#FFF8E1] border border-[#F5C400]/50 rounded-xl p-4">
          <p className="text-sm font-bold text-[#5C3D00] mb-2">Consignes :</p>
          <ul className="space-y-1 text-xs text-[#6B5000]">
            <li>• Duree : <strong>1 a 2 minutes maximum</strong></li>
            <li>• Langue principale : <strong>{langLabel}</strong></li>
            <li>• Inclure <strong>30 secondes en anglais</strong> (obligatoire)</li>
            <li>• Presentez-vous et expliquez pourquoi vous souhaitez rejoindre WithYou</li>
            <li>• Bon eclairage, fond neutre, son clair</li>
          </ul>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-[#C4BAA8] overflow-hidden text-sm">
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 py-2.5 font-semibold transition ${
            mode === "upload" ? "bg-[#5C3D00] text-[#F5C400]" : "bg-white text-[#9B8A6B] hover:bg-[#FAF8F0]"
          }`}
        >
          Televerser un fichier
        </button>
        <button
          onClick={() => setMode("link")}
          className={`flex-1 py-2.5 font-semibold border-l border-[#C4BAA8] transition ${
            mode === "link" ? "bg-[#5C3D00] text-[#F5C400]" : "bg-white text-[#9B8A6B] hover:bg-[#FAF8F0]"
          }`}
        >
          Lien YouTube / Drive
        </button>
      </div>

      {mode === "upload" && (
        <label className="block border-2 border-dashed border-[#C4BAA8] rounded-xl p-6 text-center cursor-pointer hover:border-[#F5C400] transition">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <p className="text-sm font-bold text-[#5C3D00]">{file.name}</p>
              <p className="text-xs text-[#9B8A6B] mt-1">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
              {file.size > 50 * 1024 * 1024 && (
                <p className="text-xs text-red-600 mt-1 font-semibold">Taille depassee (max 50 Mo) — utilisez un lien</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#5C3D00]">Cliquez pour selectionner votre video</p>
              <p className="text-xs text-[#9B8A6B] mt-1">MP4, MOV ou WebM · Max 50 Mo</p>
            </div>
          )}
        </label>
      )}

      {mode === "link" && (
        <div>
          <label className="text-xs font-semibold text-[#5C3D00] mb-1.5 block">
            Lien YouTube ou Google Drive (non repertorie)
          </label>
          <input
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://youtube.com/watch?v=... ou https://drive.google.com/..."
            className="w-full border border-[#C4BAA8] rounded-xl px-3 py-2.5 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30"
          />
          <p className="text-xs text-[#9B8A6B] mt-1">
            Assurez-vous que le lien est accessible (non liste / partage avec le lien)
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={uploading || (mode === "upload" ? !file || file.size > 50 * 1024 * 1024 : !link.trim())}
        className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3 rounded-xl hover:bg-[#FFDE59] disabled:opacity-40 transition text-sm"
      >
        {uploading ? "Envoi en cours…" : "Soumettre ma video →"}
      </button>
    </div>
  );
}
