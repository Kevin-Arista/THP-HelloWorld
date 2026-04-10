import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MemeVote",
  description: "Swipe, vote, and laugh at the best meme captions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geistMono.variable}>
        {/* Tron scan beam — sweeps the full page height every 7 s */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.2) 25%, rgba(0,240,255,0.7) 50%, rgba(0,240,255,0.2) 75%, transparent 100%)",
            animation: "scanBeam 7s linear infinite",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
