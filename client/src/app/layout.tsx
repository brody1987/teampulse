import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SWRProvider } from "@/components/swr-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TeamPulse - 부서 통합 관리",
    template: "%s | TeamPulse",
  },
  description: "팀 업무 파악, 프로젝트 관리, 성과 평가 통합 관리 시스템",
  openGraph: {
    title: "TeamPulse - 부서 통합 관리",
    description: "팀 업무 파악, 프로젝트 관리, 성과 평가 통합 관리 시스템",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRProvider>
          <Sidebar />
          <main className="lg:ml-64 min-h-screen bg-slate-50 pt-14 lg:pt-0">
            <div className="p-6 lg:p-8">
              {children}
            </div>
          </main>
          <Toaster position="top-right" />
        </SWRProvider>
      </body>
    </html>
  );
}
