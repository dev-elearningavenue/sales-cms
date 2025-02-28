import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { AppProvider, useApp } from "@/contexts/AppContext";
import "@/lib/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FHS Leads Management",
  description: "App description",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
