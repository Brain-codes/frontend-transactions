"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  User,
  Settings,
  PieChart,
  Users,
  Package,
  TrendingUp,
  ChevronDown,
  Home,
  Map,
} from "lucide-react";

const DashboardLayout = ({ children, currentRoute = "dashboard" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

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
    setSidebarOpen(false);
  };

  const getUserInitials = (email) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 w-72 bg-white border-r border-gray-200 shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
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
              <p className="text-xs text-blue-100">Sales Management</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/20"
            onClick={() => setSidebarOpen(false)}
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
                    ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      currentRoute === item.route
                        ? "bg-blue-100 text-blue-600"
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
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-10 h-10 rounded-full flex items-center justify-center">
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
                onClick={handleLogout}
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-72 flex flex-col min-h-screen">
        {/* Top navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative z-30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden mr-3 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5 text-black" />
              </Button>
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search sales, customers, products..."
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>

              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-8 h-8 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">
                    {getUserInitials(user?.email)}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
                    {user?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role || "Admin"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
