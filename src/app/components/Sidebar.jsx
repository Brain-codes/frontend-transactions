"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  X,
  Home,
  Map,
  Building2,
  Users,
  Plus,
  Settings,
  BarChart3,
  FileImage,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Link from "next/link";

const Sidebar = ({ isOpen, onClose, currentRoute }) => {
  const router = useRouter();
  const { isSuperAdmin, isAdmin, hasAdminAccess, isAtmosfairUser } = useAuth();

  // Navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      {
        name: "Dashboard",
        icon: Home,
        route: "dashboard",
        href: "/dashboard",
        badge: null,
        requiresAuth: true,
      },
    ];

    // Super Admin gets access to everything
    if (isSuperAdmin) {
      // TODO: TEMPORARY - Remove this atmosfair.com email navigation restriction when implementing proper role-based navigation
      // Check if this is an atmosfair.com user (special case)
      if (isAtmosfairUser) {
        return [
          {
            name: "Sales",
            icon: ShoppingCart,
            route: "sales",
            href: "/sales",
            badge: null,
            requiresAuth: true,
          },
        ];
      }

      // Regular super admin navigation
      return [
        {
          name: "Dashboard",
          icon: Home,
          route: "dashboard",
          href: "/dashboard",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Sales",
          icon: ShoppingCart,
          route: "sales",
          href: "/sales",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Partners",
          icon: Building2,
          route: "partners",
          href: "/partners",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Agreement Images",
          icon: FileImage,
          route: "agreement-images",
          href: "/agreement-images",
          badge: null,
          requiresAuth: true,
        },
        // {
        //   name: "Admin Panel",
        //   icon: BarChart3,
        //   route: "admin",
        //   href: "/admin",
        //   badge: "New",
        //   requiresAuth: true,
        // },
      ];
    }

    // Admin gets access to their organization's features
    if (isAdmin) {
      return [
        {
          name: "Dashboard",
          icon: Home,
          route: "admin",
          href: "/admin",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Sales",
          icon: ShoppingCart,
          route: "admin-sales",
          href: "/admin/sales",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Create Sale",
          icon: Plus,
          route: "admin-create-sale",
          href: "/admin/sales/create",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Agents",
          icon: Users,
          route: "admin-agents",
          href: "/admin/agents",
          badge: null,
          requiresAuth: true,
        },
        // {
        //   name: "Branches",
        //   icon: Building2,
        //   route: "admin-branches",
        //   href: "/admin/branches",
        //   badge: null,
        //   requiresAuth: true,
        // },
        {
          name: "Settings",
          icon: Settings,
          route: "admin-settings",
          href: "/admin/settings",
          badge: null,
          requiresAuth: true,
        },
        // {
        //   name: "Agreement Images",
        //   icon: FileImage,
        //   route: "admin-agreement-images",
        //   href: "/admin/agreement-images",
        //   badge: null,
        //   requiresAuth: true,
        // },
      ];
    }

    // Default navigation for other roles
    return baseItems;
  };

  const navItems = getNavItems();

  const navigateToRoute = (href) => {
    router.push(href);
    // Auto-close sidebar on mobile when clicking nav items
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Force close for mobile overlay clicks (always close regardless of screen size)
  const handleOverlayClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-in-out"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 w-72 bg-white border-r border-gray-200 flex flex-col
          transition-all duration-300 ease-in-out
          ${
            isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full shadow-none"
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
          <button
            className="lg:hidden p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            onClick={handleOverlayClick}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-h-0">
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Main Navigation
            </p>
            {navItems.map((item) => (
              <Link
                key={item.route}
                href={item.href}
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
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
