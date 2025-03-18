"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function Home() {
  const router = useRouter();
  const { session, loading } = useApp();

  useEffect(() => {
    // If session is loaded and exists, redirect to dashboard
    // If session is loaded and doesn't exist, redirect to login
    if (!loading) {
      if (session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [session, loading, router]);

  // Show loading indicator while redirecting
  return <LoadingSkeleton component="page" />;
}
