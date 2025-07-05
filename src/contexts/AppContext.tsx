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
import { usePathname, useRouter } from "next/navigation";
import { UserSession } from "@/types/session";

// Define the notification type from database
export type DbNotificationType = {
  _id: string;
  type: string;
  message: string;
  lead?: any;
  from_user?: any;
  to_users: string[];
  read_by: string[];
  read: boolean; // Computed property for UI
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

// Local notification type (temporary ones not yet saved to DB)
export type NotificationType = {
  id: string;
  message: string;
  time: Date;
  read: boolean;
  type: "lead" | "info" | "warning";
  leadId?: string;
};

export interface AppContextType {
  session: UserSession | null;
  loading: boolean;
  error: string | null;
  setSession: (session: UserSession | null) => void;
  fetchSession: () => Promise<void>;
  logout: () => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  notifications: NotificationType[];
  addNotification: (
    notification: Omit<NotificationType, "id" | "time">
  ) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadCount: number;
  dbNotifications: DbNotificationType[];
  fetchNotifications: () => Promise<void>;
  markDbNotificationAsRead: (id: string) => Promise<void>;
  markAllDbNotificationsAsRead: () => Promise<void>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Session states
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true); // Start as true to prevent premature redirects
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [dbNotifications, setDbNotifications] = useState<DbNotificationType[]>(
    []
  );
  const [notificationPolling, setNotificationPolling] =
    useState<NodeJS.Timeout | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: string;
    visible: boolean;
  } | null>(null);

  // Calculate unread count (combine local and DB notifications)
  const unreadCount =
    notifications.filter((n) => !n.read).length +
    dbNotifications.filter((n) => !n.read).length;

  // Show a toast notification
  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Add a new notification (local)
  const addNotification = (
    notification: Omit<NotificationType, "id" | "time">
  ) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      time: new Date(),
    };
    setNotifications((prev) => [newNotification, ...prev]);

    // Always show toast for the notification
    showToast(
      notification.message,
      notification.type === "warning" ? "error" : "info"
    );
  };

  // Mark a notification as read (local)
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all notifications as read (local)
  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Fetch notifications from the API
  const fetchNotifications = async () => {
    if (!session || !session._id) return;

    try {
      const response = await axios.get("/api/notifications");
      if (
        response.data &&
        response.data.success &&
        response.data.notifications
      ) {
        setDbNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Mark a DB notification as read
  const markDbNotificationAsRead = async (id: string) => {
    if (!session || !session._id) return;

    try {
      await axios.patch("/api/notifications", {
        notificationIds: [id],
      });

      // Update locally without refetching
      setDbNotifications((prev) =>
        prev.map((n) => {
          if (n._id === id) {
            return {
              ...n,
              read: true,
              readAt: new Date().toISOString(),
            };
          }
          return n;
        })
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all DB notifications as read
  const markAllDbNotificationsAsRead = async () => {
    if (!session || !session._id) return;

    try {
      await axios.patch("/api/notifications", { markAll: true });

      // Update locally without refetching
      setDbNotifications((prev) =>
        prev.map((n) => {
          if (!n.read) {
            return {
              ...n,
              read: true,
              readAt: new Date().toISOString(),
            };
          }
          return n;
        })
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Fetch session on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    }

    // Initial session fetch with timeout protection
    if (!isInitialized) {
      const initializeApp = async () => {
        try {
          await fetchSession();
        } catch (error) {
          console.error("Failed to initialize session:", error);
          // Ensure loading state is cleared even on error
          setLoading(false);
        } finally {
          setIsInitialized(true);
        }
      };

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn("Session fetch timeout - proceeding without session");
        setLoading(false);
        setIsInitialized(true);
      }, 10000); // 10 second timeout

      initializeApp().finally(() => {
        clearTimeout(timeoutId);
      });
    }
  }, [isInitialized]);

  // Set up polling for notifications when session is available
  useEffect(() => {
    if (session && session._id) {
      // Initial fetch
      fetchNotifications();

      // Set up polling
      if (!notificationPolling) {
        const intervalId = setInterval(async () => {
          try {
            // Check if session is still valid before making API call
            if (!session || !session._id) {
              console.log("No valid session, stopping notification polling");
              clearInterval(intervalId);
              setNotificationPolling(null);
              return;
            }

            // Use the last poll time if available
            const lastPollTime = new Date();
            lastPollTime.setMinutes(lastPollTime.getMinutes() - 5); // 5 minute buffer (increased from 1 minute)

            const response = await axios.get(
              `/api/notifications/updates?since=${lastPollTime.toISOString()}`
            );

            if (
              response.data.success &&
              response.data.notifications.length > 0
            ) {
              // Merge new notifications with existing ones
              setDbNotifications((prev) => {
                const existingIds = new Set(prev.map((n) => n._id));
                const newNotifications = response.data.notifications.filter(
                  (n: DbNotificationType) => !existingIds.has(n._id)
                );
                if (newNotifications.length > 0) {
                  playNotificationSound();
                }

                // Show toast for each new notification
                newNotifications.forEach((notification: DbNotificationType) => {
                  const toastType = getToastTypeForNotification(
                    notification.type
                  );
                  showToast(notification.message, toastType);
                });

                return [...newNotifications, ...prev];
              });
            }
          } catch (error) {
            console.error("Error polling for notifications:", error);
            // If it's auth error, stop polling
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              console.log("Auth error, stopping notification polling");
              clearInterval(intervalId);
              setNotificationPolling(null);
            }
          }
        }, 60000); // Poll every 60 seconds (more frequent)

        setNotificationPolling(intervalId);
      }
    } else {
      // Clear polling if session is gone
      if (notificationPolling) {
        clearInterval(notificationPolling);
        setNotificationPolling(null);
      }
    }

    return () => {
      if (notificationPolling) {
        clearInterval(notificationPolling);
      }
    };
  }, [session]);

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch((err) => {
        // Browser might block autoplay without user interaction
        console.log("Audio autoplay was blocked:", err);
      });
    } catch (err) {
      console.error("Error playing notification sound:", err);
    }
  };

  // Function to determine toast type based on notification type
  const getToastTypeForNotification = (
    type: string
  ): "success" | "error" | "info" => {
    switch (type) {
      case "lead_converted":
      case "lead_resolved":
        return "success";
      case "lead_deleted":
      case "batch_delete":
        return "error";
      default:
        return "info";
    }
  };

  const fetchSession = async () => {
    try {
      setLoading(true);

      // Add timeout to the axios request
      const response = await axios.get("/api/auth/session", {
        timeout: 5000, // 5 second timeout
      });

      if (JSON.stringify(session) !== JSON.stringify(response.data)) {
        setSession(response.data);
      }

      setError(null);
    } catch (err) {
      console.error("Session fetch error:", err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setSession(null);
          setError(null);
        } else if (err.code === "ECONNABORTED") {
          // Timeout error
          console.warn("Session fetch timeout - continuing without session");
          setSession(null);
          setError("Connection timeout");
        } else {
          setError("Failed to load session");
          setSession(null);
        }
      } else {
        setError("Network error");
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
      setSession(null);
      setError(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      // Still clear session even if something fails
      setSession(null);
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      router.push("/login");
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
    // Local notifications
    notifications,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    // DB notifications
    dbNotifications,
    fetchNotifications,
    markDbNotificationAsRead,
    markAllDbNotificationsAsRead,
    // Combined
    unreadCount,
    showToast,
  };

  return (
    <AppContext.Provider value={value}>
      {loading && !isInitialized ? (
        // Show loading screen during initial app load
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg max-w-sm z-[1000] border ${
            toast.type === "success"
              ? "bg-green-500 border-green-600"
              : toast.type === "error"
              ? "bg-red-500 border-red-600"
              : "bg-blue-500 border-blue-600"
          } text-white font-medium animate-fade-in-right`}
        >
          {toast.message}
        </div>
      )}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("use App must be used within an AppProvider");
  }
  return context;
}
