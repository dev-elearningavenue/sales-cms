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
import { usePathname } from "next/navigation";

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  href: string;
  isExpanded: boolean;
  badge?: number;
}

const Sidebar = () => {
  const { theme, toggleTheme, session } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [unassignedLeads, setUnassignedLeads] = useState(0);
  const [unresolvedLeads, setUnresolvedLeads] = useState(0);
  const pathname = usePathname();

  // Fetch unassigned and unresolved leads count
  useEffect(() => {
    // Don't fetch if not logged in - return early
    if (!session) return;

    const fetchLeadCounts = async () => {
      try {
        // Fetch unassigned leads count
        const unassignedRes = await fetch("/api/leads/count?assigned=false");
        const unassignedData = await unassignedRes.json();
        setUnassignedLeads(unassignedData.count || 0);

        // Fetch unresolved assigned leads count
        const unresolvedRes = await fetch("/api/my-leads/count?resolved=false");
        const unresolvedData = await unresolvedRes.json();
        setUnresolvedLeads(unresolvedData.count || 0);
      } catch (error) {
        console.error("Error fetching lead counts:", error);
      }
    };

    // Initial fetch
    fetchLeadCounts();

    // Set up interval to periodically refresh counts
    const intervalId = setInterval(fetchLeadCounts, 30000); // refresh every 30 seconds

    // Clean up interval on unmount or when session changes
    return () => clearInterval(intervalId);
  }, [session]); // Re-run effect when session changes

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
    if (!session) return; // Don't add listeners if not logged in

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
  }, [isPinned, session]);

  // Don't render the sidebar at all if not logged in
  if (!session) return null;

  return (
    <div
      ref={sidebarRef}
      className={`${
        isExpanded ? "w-64" : "w-16"
      } h-full dark:bg-gray-800 bg-white text-black dark:text-white p-4 transition-all duration-300 ease-in-out relative group fixed left-0 top-0 shadow-md z-10 overflow-hidden`}
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
          badge={unassignedLeads}
        />
        <NavItem
          icon={<ClipboardList size={20} />}
          text="My Leads"
          href="/my-leads"
          isExpanded={isExpanded}
          badge={unresolvedLeads}
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
const NavItem: React.FC<NavItemProps> = ({
  icon,
  text,
  href,
  isExpanded,
  badge,
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center text-lg hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white p-2 rounded-lg transition-all duration-200 group ${
          isActive ? "bg-gray-200 dark:bg-gray-700" : ""
        }`}
      >
        <div className="flex justify-center items-center w-8 h-8 relative">
          {icon}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <span
          className={`ml-3 transition-all duration-300 whitespace-nowrap ${
            isExpanded
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 absolute pointer-events-none"
          }`}
        >
          {text}
          {badge !== undefined && badge > 0 && isExpanded && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>

        {/* Tooltip for collapsed state */}
        {!isExpanded && (
          <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-sm whitespace-nowrap z-50">
            {text}
            {badge !== undefined && badge > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
};

export default Sidebar;
