import "@/lib/server";
import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import BackToTop from "./components/BackToTop";
import { AppProvider } from "@/contexts/AppContext";

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
          <Script id="chatbase-bootstrap" strategy="afterInteractive">
            {`(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="CK9lHcyXbyupaWGa5-wtb";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();`}
          </Script>
          <BackToTop />
        </AppProvider>
      </body>
    </html>
  );
}
