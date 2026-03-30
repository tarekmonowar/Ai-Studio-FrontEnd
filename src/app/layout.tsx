import type { Metadata } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import tmImage from "@/public/tm.png";
import "./globals.css";

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "TM Ai-studio",
  description:
    "Real-time AI voice assistant for interview and spoken English practice",
  icons: {
    icon: tmImage.src,
    shortcut: tmImage.src,
    apple: tmImage.src,
  },
  openGraph: {
    title: "TM Ai-studio",
    description:
      "Real-time AI voice assistant for interview and spoken English practice",
    images: [
      {
        url: tmImage.src,
        width: tmImage.width,
        height: tmImage.height,
        alt: "TM Ai-studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TM Ai-studio",
    description:
      "Real-time AI voice assistant for interview and spoken English practice",
    images: [tmImage.src],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${headingFont.variable} ${bodyFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
