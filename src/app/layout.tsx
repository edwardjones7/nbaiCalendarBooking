import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Book a Call",
  description: "Internal lead booking tool",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <nav className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl gap-1 px-4 py-2 text-sm font-medium">
            <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-zinc-100">
              Book a lead
            </Link>
            <Link href="/calendar" className="rounded-md px-3 py-1.5 hover:bg-zinc-100">
              Calendar
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
