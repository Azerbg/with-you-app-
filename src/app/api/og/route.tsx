import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") ?? "en";
  const isFr = lang === "fr";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #fdfaf4 0%, #fffef9 50%, #f8f3e8 100%)",
          padding: "80px 100px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Decorative blob */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,196,0,0.18), transparent 70%)",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", marginBottom: 40 }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: "#2D1A00" }}>With</span>
          <span style={{ fontSize: 48, fontWeight: 800, color: "#F5C400" }}>You</span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#2D1A00",
            lineHeight: 1.1,
            maxWidth: 760,
            marginBottom: 28,
          }}
        >
          {isFr ? "Apprenez une langue\navec le bon tuteur." : "Learn a language\nwith the right tutor."}
        </div>

        {/* Sub */}
        <div style={{ fontSize: 28, color: "#6B5E44", maxWidth: 680, lineHeight: 1.4 }}>
          {isFr
            ? "Cours individuels en direct avec des tuteurs vérifiés."
            : "Live 1-on-1 lessons with verified expert tutors."}
        </div>

        {/* Bottom pill */}
        <div
          style={{
            display: "flex",
            marginTop: 56,
            background: "#F5C400",
            borderRadius: 100,
            padding: "12px 32px",
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700, color: "#5C3D00" }}>
            {isFr ? "Commencer gratuitement →" : "Start for free →"}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
