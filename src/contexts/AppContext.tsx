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
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Session states
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionCheckInterval, setSessionCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Fetch session on mount and set up periodic checks
  useEffect(() => {
    // Theme initialization
    const initTheme = () => {
      try {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark";
        if (savedTheme) {
          setTheme(savedTheme);
          document.documentElement.classList.toggle(
            "dark",
            savedTheme === "dark"
          );
        }
      } catch (err) {
        console.error("Error initializing theme:", err);
      }
    };

    initTheme();

    // Initial session fetch - with a small delay to allow the page to render first
    if (!isInitialized) {
      const timer = setTimeout(() => {
        fetchSession().finally(() => {
          setIsInitialized(true);
        });
      }, 100);

      return () => clearTimeout(timer);
    }

    // Set up periodic session check
    if (isInitialized) {
      const interval = setInterval(() => {
        fetchSession();
      }, 5 * 60 * 1000); // Check every 5 minutes

      setSessionCheckInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [isInitialized]);

  // Handle navigation based on session state
  useEffect(() => {
    if (isInitialized && !loading) {
      const isPublicRoute = [
        "/login",
        "/register",
        "/forgot-password",
      ].includes(pathname);

      if (!session && !isPublicRoute) {
        router.push("/login");
      } else if (session && isPublicRoute) {
        router.push("/dashboard");
      }
    }
  }, [session, loading, isInitialized, pathname, router]);

  const fetchSession = async () => {
    try {
      setLoading(true);

      // Add a cache-busting parameter to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/auth/session?t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      // Check for success flag in response
      if (response.status === 200 && response.data && response.data.success) {
        // Remove success flag before setting session
        const { success, ...userData } = response.data;
        setSession(userData);
        setError(null);
      } else if (response.status === 200 && response.data) {
        // Legacy response format without success flag
        setSession(response.data);
        setError(null);
      } else {
        console.error("Invalid session response format:", response.data);
        setSession(null);
        setError("Invalid session data format");
      }
    } catch (err) {
      console.error("Session fetch error:", err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          // Session expired or invalid
          setSession(null);
          setError(null);
        } else {
          const errorMessage = err.response?.data?.message || err.message;
          setError(`Failed to load session: ${errorMessage}`);
          setSession(null);
        }
      } else {
        setError("An unexpected error occurred");
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axios.post("/api/auth/logout");

      // Clear session immediately
      setSession(null);
      setError(null);

      // Navigate to login page
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);

      // Still clear session even if logout API fails
      setSession(null);
      setError("Logout failed, but session cleared");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch (err) {
      console.error("Error saving theme to localStorage:", err);
    }
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
