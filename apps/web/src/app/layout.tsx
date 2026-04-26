import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { GlobalFilterProvider } from "@/context/GlobalFilterProvider";
import Sidebar from "@/components/Sidebar";
import GlobalFilterBar from "@/components/GlobalFilterBar";
import ChatWidget from "@/components/ChatWidget";
import MobileNav from "@/components/MobileNav";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Pulse v2",
  description: "HBx AI-Powered Pre-Sale Platform — Mission Control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalFilterProvider>
          <ToastProvider>
            <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
              <Sidebar />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Suspense fallback={null}>
                  <GlobalFilterBar />
                </Suspense>
                <main className="mobile-main" style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
                  {children}
                </main>
              </div>
            </div>
            <MobileNav />
          </ToastProvider>
        </GlobalFilterProvider>
        <ChatWidget />
      </body>
    </html>
  );
}
