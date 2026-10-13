import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import AnimatedBackground from "@/components/AnimatedBackground";
import { LanguageProvider } from "@/context/LanguageContext";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const isFr = jar.get("wy_lang")?.value === "fr";

  const title = isFr
    ? "WithYou — Cours de langues en direct"
    : "WithYou — Language Learning Platform";
  const description = isFr
    ? "Cours individuels en direct avec des tuteurs experts vérifiés. Commencez par une séance découverte gratuite de 30 min."
    : "Live 1-on-1 language learning with verified expert tutors. Start with a free 30-min discovery session.";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://with-you-app-red.vercel.app";
  const ogImage = `${siteUrl}/api/og?lang=${isFr ? "fr" : "en"}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "WithYou",
      locale: isFr ? "fr_FR" : "en_US",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "WithYou" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const htmlLang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return (
    <html lang={htmlLang} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AnimatedBackground />
        <LanguageProvider>
          <Providers>{children}</Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
