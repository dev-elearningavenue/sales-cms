"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Home,
  ClipboardList,
  Settings,
  User,
  Sun,
  Moon,
  Pin,
  PinOff,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";

interface SidebarProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  href: string;
  isExpanded: boolean;
}

const Sidebar = () => {
  const { theme, toggleTheme } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Toggle pin state
  const togglePin = (): void => {
    setIsPinned(!isPinned);
    // If unpinning, also collapse if not being hovered
    if (isPinned) {
      setIsExpanded(false);
    } else {
      // If pinning, ensure it stays expanded
      setIsExpanded(true);
    }
  };

  // Handle mouse enter - expand if not pinned
  const handleMouseEnter = (): void => {
    if (!isPinned) {
      setIsExpanded(true);
    }
  };

  // Handle mouse leave - collapse if not pinned
  const handleMouseLeave = (): void => {
    if (!isPinned) {
      setIsExpanded(false);
    }
  };

  // Handle clicks outside the sidebar to collapse when not pinned
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current instanceof HTMLElement &&
        !sidebarRef.current.contains(event.target as Node) &&
        !isPinned
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPinned]);

  return (
    <div
      ref={sidebarRef}
      className={`${
        isExpanded ? "w-64" : "w-16"
      } h-full dark:bg-gray-800 bg-white text-black dark:text-white p-4 transition-all duration-300 ease-in-out relative group fixed left-0 top-0 shadow-md z-50`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Single Toggle Button for Menu/Pin */}
      <button
        onClick={togglePin}
        className="absolute right-2 top-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all duration-300"
        title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
      >
        {isPinned ? <PinOff size={20} /> : <Pin size={20} />}
      </button>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute bottom-2 mx-auto flex justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Logo/Brand */}
      <div className="flex justify-center items-center mb-8 mt-6">
        {isExpanded ? (
          <h2 className="text-xl font-semibold transition-opacity duration-300">
            SideBar
          </h2>
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            S
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <ul className="space-y-2 mt-4">
        <NavItem
          icon={<Home size={20} />}
          text="Home"
          href="/"
          isExpanded={isExpanded}
        />
        <NavItem
          icon={<ClipboardList size={20} />}
          text="Leads"
          href="/leads"
          isExpanded={isExpanded}
        />
        <NavItem
          icon={<ClipboardList size={20} />}
          text="My Leads"
          href="/my-leads"
          isExpanded={isExpanded}
        />
        <NavItem
          icon={<Settings size={20} />}
          text="Settings"
          href="/settings"
          isExpanded={isExpanded}
        />
        <NavItem
          icon={<User size={20} />}
          text="Profile"
          href="/profile"
          isExpanded={isExpanded}
        />
      </ul>
    </div>
  );
};

// NavItem component for cleaner code
const NavItem: React.FC<NavItemProps> = ({ icon, text, href, isExpanded }) => {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center text-lg hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white p-2 rounded-lg transition-all duration-200 group"
      >
        <div className="flex justify-center items-center w-8 h-8">{icon}</div>
        <span
          className={`ml-3 transition-all duration-300 whitespace-nowrap ${
            isExpanded
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 absolute pointer-events-none"
          }`}
        >
          {text}
        </span>

        {/* Tooltip for collapsed state */}
        {!isExpanded && (
          <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-sm whitespace-nowrap z-50">
            {text}
          </div>
        )}
      </Link>
    </li>
  );
};

export default Sidebar;
