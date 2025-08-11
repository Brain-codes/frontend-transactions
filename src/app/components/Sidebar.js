"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, LogOut, X, Settings, Home, Map } from "lucide-react";

const Sidebar = ({ isOpen, onClose, currentRoute, user, onLogout }) => {
  const router = useRouter();

  const navItems = [
    {
      name: "Dashboard",
      icon: Home,
      route: "dashboard",
      href: "/dashboard",
      badge: null,
    },
    {
      name: "Sales",
      icon: ShoppingCart,
      route: "sales",
      href: "/sales",
      badge: null,
    },
    {
      name: "Heat Map",
      icon: Map,
      route: "map",
      href: "/map",
      badge: null,
    },
  ];

  const navigateToRoute = (href) => {
    router.push(href);
    onClose();
  };

  const getUserInitials = (email) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 w-72 bg-white border-r border-gray-200 shadow-xl transform transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 bg-gradient-to-r from-brand to-brand">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm w-10 h-10 rounded-xl flex items-center justify-center p-1">
              <Image
                src="/logo_icon.png"
                alt="Atmosfair Icon"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Atmosfair</h1>
              <p className="text-xs text-white/70">Sales Management</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-h-0">
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Main Navigation
            </p>
            {navItems.map((item) => (
              <button
                key={item.route}
                onClick={() => navigateToRoute(item.href)}
                className={`group flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  currentRoute === item.route
                    ? "bg-brand/10 text-brand border border-brand/20 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      currentRoute === item.route
                        ? "bg-brand text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {getUserInitials(user?.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
