import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Keepalive | iMessage-native follow-up agent",
  description:
    "Keepalive is an iMessage-native agent built with Photon that remembers who matters, what you promised, and when to follow up.",
  openGraph: {
    title: "Keepalive",
    description:
      "An iMessage-native agent that remembers who matters, what you promised, and when to follow up.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Keepalive",
    description:
      "An iMessage-native agent that remembers who matters, what you promised, and when to follow up.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#050914] text-white">{children}</body>
    </html>
  );
}
