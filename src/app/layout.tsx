import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClawdTM - Skills for Moltbot",
  description: "Browse and install skills for your Moltbot agent. Search through hundreds of community-built skill packs.",
  keywords: ["moltbot", "clawdbot", "claude", "skills", "agent", "AI", "automation"],
  authors: [{ name: "0xMythril" }],
  openGraph: {
    title: "ClawdTM - Skills for Moltbot",
    description: "Browse and install skills for your Moltbot agent",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawdTM - Skills for Moltbot",
    description: "Browse and install skills for your Moltbot agent",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
