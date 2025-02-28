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
import { useRouter } from "next/navigation";
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

  // Session states
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Fetch session on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const response = await axios.get("/api/auth/session");
      // console.log("Session fetched in app context: ", response.data);
      setSession(response.data);
      setError(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Don't set error for expected non-authenticated state
        setError(null);
      } else {
        setError("Failed to load session");
      }
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axios.post("/api/auth/logout");
      setSession(null);
      setError(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Logout failed");
      } else {
        setError("Failed to load session");
      }
      setSession(null);
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
    throw new Error("use App must be used within an AppProvider");
  }
  return context;
}
