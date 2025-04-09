"use client";
import { useApp, DbNotificationType } from "@/contexts/AppContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { User, Moon, Sun, Bell, CheckCircle } from "lucide-react";
import { LoadingSkeleton } from "./LoadingSkeleton";

export const Navbar = () => {
  const {
    session,
    logout,
    loading,
    theme,
    toggleTheme,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dbNotifications,
    markDbNotificationAsRead,
    markAllDbNotificationsAsRead,
    unreadCount,
  } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a minute
    if (diff < 60000) {
      return "Just now";
    }

    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }

    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }

    // Otherwise return date
    return date.toLocaleDateString();
  };

  // Handle local notification click
  const handleNotificationClick = (id: string, leadId?: string) => {
    markNotificationAsRead(id);

    // Navigate to lead if leadId is provided
    if (leadId) {
      router.push(`/leads?id=${leadId}`);
    }

    setIsNotificationsOpen(false);
  };

  // Handle DB notification click
  const handleDbNotificationClick = (notification: DbNotificationType) => {
    markDbNotificationAsRead(notification._id);

    // Navigate based on notification type and data
    if (notification.lead && notification.lead._id) {
      // For notifications related to a specific lead
      router.push(`/leads?id=${notification.lead._id}`);
    } else if (
      notification.type === "batch_assign" ||
      notification.type === "batch_delete"
    ) {
      // For batch operations, go to my-leads page
      router.push("/my-leads");
    } else if (notification.type === "new_lead") {
      // For new leads, go to leads page
      router.push("/leads");
    }

    setIsNotificationsOpen(false);
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
    markAllDbNotificationsAsRead();
  };

  return (
    <nav className="flex justify-between p-2 bg-white dark:bg-gray-800 transition-colors">
      <div className="flex p-2 justify-between items-center space-x-4">
        <button onClick={() => router.push("/dashboard")} className="text-xl">
          <h1 className="text-xl font-bold dark:text-white">Dashboard</h1>
        </button>
      </div>

      <div className="flex p-2 items-center space-x-4">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors ${
            theme === "dark"
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-800"
          } flex items-center justify-center`}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        {session && (
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white relative flex items-center justify-center"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 && dbNotifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  <div>
                    {/* DB Notifications first */}
                    {dbNotifications.map((notification) => {
                      // Check if notification is new (less than 5 minutes old)
                      const isNew =
                        new Date().getTime() -
                          new Date(notification.createdAt).getTime() <
                        5 * 60 * 1000;

                      return (
                        <div
                          key={notification._id}
                          onClick={() =>
                            handleDbNotificationClick(notification)
                          }
                          className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                            !notification.read
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : ""
                          } ${isNew ? "border-l-4 border-l-blue-500" : ""}`}
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div
                                className={`text-sm ${
                                  !notification.read ? "font-semibold" : ""
                                } dark:text-white`}
                              >
                                {notification.message}
                                {isNew && (
                                  <span className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                    New
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(notification.createdAt)}
                              </div>
                            </div>
                            {notification.read && (
                              <span className="text-green-500">
                                <CheckCircle size={16} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Local Notifications */}
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() =>
                          handleNotificationClick(
                            notification.id,
                            notification.leadId
                          )
                        }
                        className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                          !notification.read
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div
                              className={`text-sm ${
                                !notification.read ? "font-semibold" : ""
                              } dark:text-white`}
                            >
                              {notification.message}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatTime(notification.time)}
                            </div>
                          </div>
                          {notification.read && (
                            <span className="text-green-500">
                              <CheckCircle size={16} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading || (!session && pathname !== "/login") ? (
          <LoadingSkeleton component="profile" />
        ) : session ? (
          // Logged-in view
          <div className="relative group" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex text-black dark:text-white items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
            >
              <User size={20} />
              <span>{session?.user_name || session?.full_name}</span>
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-gray-800 group-hover:block z-50">
                <button
                  onClick={() => {
                    router.push("/profile");
                    setIsProfileOpen(false);
                  }}
                  className="block px-4 py-2 text-sm w-full text-left dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          // Logged-out view
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};
