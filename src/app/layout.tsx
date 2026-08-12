import type { Metadata } from "next";
import { Outfit, Rozha_One } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const rozhaOne = Rozha_One({
  variable: "--font-rozha-one",
  weight: "400",
  subsets: ["devanagari", "latin"],
});

export const metadata: Metadata = {
  title: "Jammu Matadoor Radio — Local Beats playing live",
  description: "A live local radio station playing Dogri folk, high-bass Punjabi, and Bollywood remixes that play in the minibuses of Jammu. Real-time passenger count, local IST time, and tracks linked to Spotify and YouTube Music.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${rozhaOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white selection:bg-[#00ff66]/30 selection:text-[#00ff66]">
        {children}
      </body>
    </html>
  );
}
