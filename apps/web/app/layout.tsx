import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import ChatWidget from "@/components/ChatWidget";
import GlobalCommand from "@/components/GlobalCommand";
import { PageVisitTracker } from "@/components/PageVisitTracker";


export const metadata: Metadata = {
  title: "Toku Help Center",
  description: "Find answers to your questions about Toku",
};

export function generateViewport() {
  return {
    themeColor: "#1F5AE0",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <TopLoadingBar />
        <PageVisitTracker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWidget />
        <GlobalCommand />
      </body>
    </html>
  );
}