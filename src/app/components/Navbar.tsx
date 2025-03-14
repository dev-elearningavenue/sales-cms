"use client";
import { useApp } from "@/contexts/AppContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { User, Moon, Sun } from "lucide-react";
import { LoadingSkeleton } from "./LoadingSkeleton";

export const Navbar = () => {
  const { session, logout, loading, theme, toggleTheme } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {loading ? (
          <LoadingSkeleton component="profile" />
        ) : session ? (
          <div className="relative group" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex text-black dark:text-white items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
            >
              <User size={20} />
              <span>{session?.user_name || session?.full_name}</span>
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-gray-800 group-hover:block">
                <button
                  onClick={() => router.push("/profile")}
                  className="block px-4 py-2 text-sm w-full text-left dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Profile
                </button>
                <button
                  onClick={logout}
                  className="block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
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
