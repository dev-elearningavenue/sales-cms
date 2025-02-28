// src/app/dashboard/page.tsx
"use client";
import { useApp } from "@/contexts/AppContext";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter(); // For client-side redirects, we should use the router from next/navigation.
  const { session, fetchSession, error, loading } = useApp();

  useEffect(() => {
    fetchSession();
  }, []);

  if (!session) {
    // console.log("No Session: ", session);
    return null;
  }

  if (error) return <div>Errorrrrr: {error}</div>;
  // console.log("Dashboard Session: ", session);
  return (
    <div className="p-6">
      {loading ? (
        <LoadingSkeleton />
      ) : session ? (
        <>
          <h1 className="text-2xl font-semibold">
            Welcome, {session.full_name || "Mustafa"} to Admin Dashboard!
          </h1>
          <p className="text-gray-600 mt-2">Manage your system efficiently.</p>
          {/* <p className="text-gray-600 mt-2">{session.full_name}</p> */}
        </>
      ) : (
        <p>No session</p>
      )}
    </div>
  );
}
