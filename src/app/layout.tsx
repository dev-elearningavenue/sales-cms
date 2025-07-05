import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { AppProvider } from "@/contexts/AppContext";
import "@/lib/server";
import BackToTop from "./components/BackToTop";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FHS Leads Management",
  description: "App description",
};

// Add client-side error handling for chunk load errors
const ClientErrorHandler = () => {
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      if (event.error?.name === "ChunkLoadError") {
        console.warn("ChunkLoadError detected, reloading page...");
        window.location.reload();
      }
    });

    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason?.name === "ChunkLoadError") {
        console.warn("ChunkLoadError in promise, reloading page...");
        window.location.reload();
      }
    });
  }
  return null;
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientErrorHandler />
        <AppProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Navbar />
              <main className="flex-1 overflow-y-auto relative">
                {children}
              </main>
            </div>
          </div>
          <BackToTop />
        </AppProvider>
      </body>
    </html>
  );
}
