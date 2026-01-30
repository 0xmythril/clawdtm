import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { GA4 } from "@/components/gtm";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClawdTM - Skills for OpenClaw",
  description: "Browse and install skills for your OpenClaw agent. Search through hundreds of community-built skill packs.",
  keywords: ["openclaw", "claude", "skills", "agent", "AI", "automation"],
  authors: [{ name: "0xMythril" }],
  metadataBase: new URL("https://clawdtm.com"),
  openGraph: {
    title: "ClawdTM - Skills for OpenClaw",
    description: "Browse and install skills for your OpenClaw agent. Search through hundreds of community-built skill packs.",
    type: "website",
    url: "https://clawdtm.com",
    siteName: "ClawdTM",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@0xmythril",
    creator: "@0xmythril",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <GA4 />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
