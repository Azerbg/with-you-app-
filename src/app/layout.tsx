import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import AnimatedBackground from "@/components/AnimatedBackground";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "WithYou — Language Learning Platform",
  description: "Connect with expert tutors and accelerate your language learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
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
