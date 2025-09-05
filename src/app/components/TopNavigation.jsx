"use client";

import { Button } from "@/components/ui/button";
import { Menu, ChevronDown } from "lucide-react";

const TopNavigation = ({
  onToggleSidebar,
  title,
  description,
  rightButton,
  user,
}) => {
  const getUserInitials = (email) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

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
            <Menu className="h-5 w-5 text-gray-700" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-0.5 sm:mt-1 truncate">
              {description}
            </p>
          </div>
        </div>

        {/* Right side - Optional button + User profile */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
          {/* Optional right button */}
          {rightButton && <div className="hidden sm:block">{rightButton}</div>}

          <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-gray-200">
            <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {getUserInitials(user?.email)}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700 max-w-[120px] lg:max-w-[150px] truncate">
                {user?.full_name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-gray-500">{user?.role || "Admin"}</p>
            </div>
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavigation;
