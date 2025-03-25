// src/contexts/AppContext.tsx
"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";
import { UserSession } from "@/types/session";

interface AppContextType {
  // Session related
  session: UserSession | null;
  setSession: (session: UserSession | null) => void;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  fetchSession: () => Promise<void>;
  // Theme related
  theme: string | "light" | "dark";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Client-side session management
// Handles session state and authentication flows
export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Session states
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | "light" | "dark">("light");

  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionCheckInterval, setSessionCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Fetch session on mount and set up periodic checks
  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    }
    fetchSession();
    // if (!isInitialized) {
    //   fetchSession();
    //   setIsInitialized(true);
    // }
  }, []);

  // useEffect(() => {
  //   fetchSession();
  // }, []);

  const fetchSession = async () => {
    // if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // setLoading(true);
      const response = await axios.get("/api/auth/session");
      // console.log("Session fetched in app context: ", response.data);
      if (response.status !== 200) {
        if (response.status === 401) {
          setSession(null);
          return;
        }
        throw new Error("Failed to fetch session");
      }

      setSession(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching session:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Don't set error for expected non-authenticated state
        setSession(null);
        setError("Axios Error");
      } else {
        setError("Failed to load session");
        setSession(null);
      }
      // setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation based on session state
  // useEffect(() => {
  //   if (isInitialized && !loading) {
  //     const isPublicRoute = [
  //       "/login",
  //       "/register",
  //       "/forgot-password",
  //     ].includes(pathname);

  //     if (!session && !isPublicRoute) {
  //       router.push("/login");
  //     } else if (session && isPublicRoute) {
  //       router.push("/dashboard");
  //     }
  //   }
  // }, [session, loading, isInitialized, pathname, router]);

  // const fetchSession = async () => {
  //   try {
  //     setLoading(true);
  //     const response = await axios.get("/api/auth/session");

  //     if (response.status === 200 && response.data) {
  //       setSession(response.data);
  //       setError(null);
  //     } else {
  //       setSession(null);
  //       setError("Invalid session data");
  //     }
  //   } catch (err) {
  //     console.error("Session fetch error:", err);

  //     if (axios.isAxiosError(err)) {
  //       if (err.response?.status === 401) {
  //         // Session expired or invalid
  //         setSession(null);
  //         setError(null);
  //       } else {
  //         setError(`Failed to load session: ${err.message}`);
  //         setSession(null);
  //       }
  //     } else {
  //       setError("An unexpected error occurred");
  //       setSession(null);
  //     }
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const logout = async () => {
    try {
      console.log("Logging out...");
      setLoading(true);
      const response = await axios.post("/api/auth/logout");

      // Clear session state regardless of response status
      setSession(null);
      setError(null);

      // Use replace instead of push to prevent history issues
      router.replace("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Logout failed");

      // Still clear session even if API call fails
      setSession(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const value = {
    // Session
    session,
    loading,
    error,
    setSession,
    fetchSession,
    logout,
    theme,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
