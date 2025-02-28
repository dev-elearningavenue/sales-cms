// src/hooks/useSession.ts
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { UserSession } from "@/types/session";

export function useSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function fetchSession() {
      try {
        // Create an API endpoint that returns the session data
        const response = await axios.get("/api/auth/session");
        if (mounted) {
          setSession(response.data);
          setError(null);
        }
      } catch (err) {
        // console.error("Failed to fetch session:", err);
        if (mounted) {
          setSession(null);
          // Don't set error for 401 status as it's expected for non-authenticated users
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            setError(null);
          } else {
            setError("Failed to load session");
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSession();

    return () => {
      mounted = false;
    };
  }, []);

  // useEffect(() => {
  //   const cookies = document.cookie.split(";");
  //   console.log("cookies: ",document.cookie);
  //   const sessionCookie = cookies.find((cookie) =>
  //     cookie.trim().startsWith("token=")
  //   );
  //   if (sessionCookie) {
  //       const token = sessionCookie.split("=")[1].trim(); // when set as not HTTpOnly
  //       setSession(sessionData);
  //   }
  // }, []);

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setSession(null);
      setError(null);
      router.push("/login"); // Redirect to login page after logout
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Logout failed");
    }
  };

  return { session, setSession, loading, error, logout };
}

// export function useSession() {
//   const [session, setSession] = useState<{ email: string } | null>(null);

//   useEffect(() => {
//     const checkSession = async () => {
//       const response = await fetch("/api/auth/me");
//       if (response.ok) {
//         const data = await response.json();
//         setSession(data);
//       } else {
//         setSession(null);
//       }
//     };
//     checkSession();
//   }, []);

//   return { session, setSession };
// }
