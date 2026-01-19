"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Mail,
  PanelLeft,
  Shield,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TopNavigation = ({
  onToggleSidebar,
  title,
  description,
  rightButton,
  user,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const {
    signOut,
    getStoredProfile,
    isSuperAdmin,
    isAdmin,
    isAgent,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();

  // Navigate to login when user becomes unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserDropdown]);

  const getUserInitials = (email) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();

      // Small delay to ensure auth state is properly cleared
      setTimeout(() => {
        // Force immediate navigation to login page
        window.location.href = "/login";
      }, 100);
    } catch (error) {
      console.error("Error during logout:", error);
      // Still navigate to login even if there was an error
      window.location.href = "/login";
    }
  };

  const getUserRole = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isAdmin) return "Admin";
    if (isAgent) return "Agent";
    return "User";
  };

  const getRoleBadgeColor = () => {
    if (isSuperAdmin) return "bg-purple-100 text-purple-800 border-purple-200";
    if (isAdmin) return "bg-blue-100 text-blue-800 border-blue-200";
    if (isAgent) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Get additional profile data
  const storedProfile = getStoredProfile();
  const organizationName =
    storedProfile?.organizations?.partner_name ||
    storedProfile?.organization?.partner_name;

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 relative z-30 flex-shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left side - Sidebar toggle + Title and description */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 flex-shrink-0"
            onClick={onToggleSidebar}
          >
            <PanelLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <div className="min-w-0 flex-1">
            <img src="/logo.png" className="w-auto h-[65px]" />
            {/* <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5 sm:mt-1 truncate">
              {description}
            </p> */}
          </div>
        </div>

        {/* Right side - Optional button + User profile */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
          {/* Optional right button */}
          {rightButton && <div className="hidden sm:block">{rightButton}</div>}

          <div className="relative" ref={dropdownRef}>
            <div
              className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-gray-200 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xs">
                  {getUserInitials(user?.email)}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700 max-w-[120px] lg:max-w-[150px] truncate">
                  {storedProfile?.full_name ||
                    user?.email?.split("@")[0] ||
                    "User"}
                </p>
                <p className="text-xs text-gray-500">{getUserRole()}</p>
              </div>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            </div>

            {/* User Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                {/* User Info Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-12 h-12 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {getUserInitials(user?.email)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {storedProfile?.full_name ||
                          user?.email?.split("@")[0] ||
                          "User"}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-600 truncate">
                          {user?.email || "user@example.com"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={`text-xs px-2 py-1 ${getRoleBadgeColor()}`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {getUserRole()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Organization Info */}
                  {organizationName && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          Organization
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                        {organizationName}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Items */}
                <div className="p-2">
                  {/* <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      // Navigate to settings page when implemented
                      console.log("Navigate to settings");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>Account Settings</span>
                  </button>
                   */}
                  <Link
                    href="/profile"
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>Account Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavigation;
