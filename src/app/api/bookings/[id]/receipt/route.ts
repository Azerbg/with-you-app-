import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
      tutor: {
        select: {
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
        },
      },
    },
  });

  if (!booking) return new NextResponse("Not found", { status: 404 });
  if (booking.studentId !== session.user.id) return new NextResponse("Forbidden", { status: 403 });
  if (booking.status !== "COMPLETED" && booking.status !== "CONFIRMED") {
    return new NextResponse("Receipt not available for this booking", { status: 400 });
  }

  const tutorName =
    booking.tutor.firstName && booking.tutor.lastName
      ? `${booking.tutor.firstName} ${booking.tutor.lastName}`
      : booking.tutor.hrApplication?.fullName ?? "Tuteur";

  const studentName =
    booking.student.firstName && booking.student.lastName
      ? `${booking.student.firstName} ${booking.student.lastName}`
      : booking.student.email;

  const sessionDate = new Date(booking.scheduledAt).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Africa/Tunis",
  });

  const sessionTime = new Date(booking.scheduledAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Tunis",
  });

  const receiptDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const amount = booking.studentPriceUsd ?? 0;
  const currency = booking.studentCurrency ?? "USD";

  const SESSION_TYPE_LABEL: Record<string, string> = {
    DISCOVERY: "Séance de découverte",
    SINGLE: "Séance individuelle",
    PROGRAM: "Séance programme",
    SUBSCRIPTION: "Séance abonnement",
  };
  const sessionTypeLabel = SESSION_TYPE_LABEL[booking.sessionType] ?? "Séance";

  const shortId = id.slice(0, 8).toUpperCase();
  const statusLabel = booking.status === "COMPLETED" ? "Terminée" : "Confirmée";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu WithYou #${shortId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #F7F5F0; padding: 40px 20px; color: #2D1A00; }
    .page { max-width: 620px; margin: 0 auto; }
    .receipt { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
    .header { background: #5C3D00; padding: 36px 36px 30px; color: white; }
    .logo { font-size: 20px; font-weight: 900; color: #F5C400; letter-spacing: -0.5px; margin-bottom: 16px; }
    .header h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
    .header p { color: rgba(255,255,255,0.5); font-size: 13px; }
    .receipt-num { display: inline-block; margin-top: 18px; background: rgba(245,196,0,0.15); border: 1px solid rgba(245,196,0,0.3); border-radius: 8px; padding: 5px 14px; font-size: 12px; font-weight: 700; color: #F5C400; letter-spacing: 1.5px; }
    .body { padding: 32px 36px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9B8A6B; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #F2EFE9; }
    .row { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 0; border-bottom: 1px dashed #F2EFE9; }
    .row:last-child { border-bottom: none; }
    .row .label { font-size: 13px; color: #6B5E44; }
    .row .value { font-size: 13px; font-weight: 600; color: #2D1A00; text-align: right; max-width: 60%; }
    .total-box { background: #FFFBEA; border: 1.5px solid #F5C400; border-radius: 12px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
    .total-box .label { font-size: 15px; font-weight: 700; color: #5C3D00; }
    .total-box .value { font-size: 28px; font-weight: 900; color: #5C3D00; }
    .footer { padding: 24px 36px 28px; background: #F7F5F0; text-align: center; border-top: 1px solid #EDE9E0; }
    .footer p { font-size: 12px; color: #9B8A6B; line-height: 1.7; }
    .footer strong { color: #5C3D00; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; background: #F5C400; color: #5C3D00; font-weight: 700; font-size: 14px; padding: 11px 28px; border-radius: 50px; border: none; cursor: pointer; text-decoration: none; transition: background 0.15s; }
    .print-btn:hover { background: #FFDE59; }
    .status-badge { display: inline-flex; align-items: center; gap: 5px; background: #ECFDF5; color: #065F46; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
      .footer { background: white; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="receipt">
      <div class="header">
        <div class="logo">WithYou</div>
        <h1>Reçu de paiement</h1>
        <p>Émis le ${receiptDate}</p>
        <div class="receipt-num">N° ${shortId}</div>
      </div>

      <div class="body">
        <div class="section">
          <div class="section-title">Détails de la séance</div>
          <div class="row"><span class="label">Type</span><span class="value">${sessionTypeLabel}</span></div>
          <div class="row"><span class="label">Date</span><span class="value" style="text-transform:capitalize">${sessionDate}</span></div>
          <div class="row"><span class="label">Heure</span><span class="value">${sessionTime} (heure Tunisie)</span></div>
          <div class="row"><span class="label">Durée</span><span class="value">${booking.durationMins} minutes</span></div>
          <div class="row"><span class="label">Tuteur</span><span class="value">${tutorName}</span></div>
          <div class="row"><span class="label">Statut</span><span class="value"><span class="status-badge">✓ ${statusLabel}</span></span></div>
        </div>

        <div class="section">
          <div class="section-title">Informations de facturation</div>
          <div class="row"><span class="label">Étudiant</span><span class="value">${studentName}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${booking.student.email}</span></div>
          <div class="row"><span class="label">Réservation</span><span class="value">#${shortId}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Résumé du paiement</div>
          <div class="row">
            <span class="label">${sessionTypeLabel} · ${booking.durationMins} min</span>
            <span class="value">${amount.toFixed(2)} ${currency}</span>
          </div>
          <div class="row">
            <span class="label">Frais de service</span>
            <span class="value">0.00 ${currency}</span>
          </div>
          <div class="total-box">
            <span class="label">Total payé</span>
            <span class="value">${amount.toFixed(2)} ${currency}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>
          Merci d'avoir choisi <strong>WithYou</strong>.<br>
          Ce document constitue votre reçu officiel de paiement.<br>
          Pour toute question : <strong>support@withyou.com</strong>
        </p>
        <a href="javascript:window.print()" class="print-btn no-print">
          🖨️ Imprimer / Enregistrer en PDF
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache",
    },
  });
}
