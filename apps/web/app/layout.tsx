import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Home } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Toku Help Center",
  description: "Find answers to your questions about Toku",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="sticky top-0 z-50 bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                <Home className="h-5 w-5" />
                Toku Help Center
              </Link>
              <nav className="flex items-center gap-6">
                <Link href="/" className="text-sm hover:text-primary transition-colors">
                  Home
                </Link>
                <Link href="/search" className="text-sm hover:text-primary transition-colors">
                  Search
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-gray-50 border-t mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-sm text-gray-600">
              © {new Date().getFullYear()} Toku. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}