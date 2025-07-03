import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/providers";
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import "./globals.css";
import '@coinbase/onchainkit/styles.css';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MiTanda",
  description: "Decentralized, onchain rotating savings and credit associations (ROSCAs) for global communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="min-h-screen bg-white">
            <Header />
            {children}
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
