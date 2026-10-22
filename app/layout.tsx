import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Poppins, Geist_Mono } from "next/font/google";
import SidebarGame from "@/komponen/sidebar-game";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manajemen Joki",
  description: "Aplikasi manajemen order, worker, dan pencairan joki game",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Suspense fallback={<div className="h-14 shrink-0" />}>
          <SidebarGame />
        </Suspense>
        {children}
      </body>
    </html>
  );
}