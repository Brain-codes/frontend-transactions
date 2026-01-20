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
  Key,
  User,
  Package,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Link from "next/link";

const Sidebar = ({ isOpen, onClose, currentRoute }) => {
  const router = useRouter();
  const { isSuperAdmin, isAdmin, isAgent, hasAdminAccess, isAtmosfairUser } =
    useAuth();

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
          name: "Stove ID Management",
          icon: Package,
          route: "stove-management",
          href: "/stove-management",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "User Management",
          icon: Users,
          route: "user-management",
          href: "/user-management",
          badge: null,
          requiresAuth: true,
        },
        {
          name: "Credentials",
          icon: Key,
          route: "admin-credentials",
          href: "/admin/credentials",
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
        {
          name: "Profile",
          icon: User,
          route: "profile",
          href: "/profile",
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
        {
          name: "Stove ID Management",
          icon: Package,
          route: "stove-management",
          href: "/stove-management",
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
        // {
        //   name: "Settings",
        //   icon: Settings,
        //   route: "admin-settings",
        //   href: "/admin/settings",
        //   badge: null,
        //   requiresAuth: true,
        // },
        {
          name: "Profile",
          icon: User,
          route: "profile",
          href: "/profile",
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

    // Agent gets access to sales creation and viewing
    if (isAgent) {
      return [
        {
          name: "Dashboard",
          icon: Home,
          route: "agent",
          href: "/agent",
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
          name: "Profile",
          icon: User,
          route: "profile",
          href: "/profile",
          badge: null,
          requiresAuth: true,
        },
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
        className={`fixed top-0 left-0 h-screen z-50 w-72 border-r border-gray-200 flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: "#fafafa" }}
      >
        {/* Sidebar Header */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2
              className="font-bold text-lg"
              style={{ color: "rgb(7, 55, 106)" }}
            >
              CONTROL PANEL
            </h2>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
          onClick={handleOverlayClick}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            // Check if current route matches item route
            const isActive = currentRoute === item.route;

            return (
              <Link
                key={item.route}
                href={item.href}
                onClick={() => navigateToRoute(item.href)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive
                    ? "bg-white text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-white/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
