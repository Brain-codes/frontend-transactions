"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
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
  LayoutDashboard,
  FileImage,
  Key,
  User,
  UserCheck,
  Package,
  Tag,
  Layers,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import Link from "next/link";

const allNavItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    route: "dashboard",
    href: "/dashboard",
  },
  {
    name: "Agent Manager",
    icon: Users,
    route: "agents",
    href: "/agents",
  },
  {
    name: "Manage Partners",
    icon: UserCheck,
    route: "partners",
    href: "/partners",
  },
  {
    name: "Sales",
    icon: ShoppingCart,
    route: "sales",
    href: "/sales",
  },
  // {
  //   name: "Stove Management",
  //   icon: Tag,
  //   route: "stove-management",
  //   href: "/stove-management",
  // },
  {
    name: "Stove Manager",
    icon: Package,
    route: "stove-manager",
    href: "/stove-manager",
  },
  {
    name: "Transfer History",
    icon: ArrowLeftRight,
    route: "stove-transfer-history",
    href: "/stove-transfer-history",
  },
  // {
  //   name: "Agreement Images",
  //   icon: FileImage,
  //   route: "agreement-images",
  //   href: "/agreement-images",
  // },
  {
    name: "Settings",
    icon: Settings,
    route: "settings",
    children: [
      {
        name: "Payment Models",
        route: "settings-payment-models",
        href: "/payment-models",
      },
      {
        name: "User Management",
        route: "settings-user-management",
        href: "/user-management",
      },
      {
        name: "Credentials",
        route: "settings-credentials",
        href: "/admin/credentials",
      },
      {
        name: "System Configuration",
        route: "settings-system-config",
        href: "/admin/system-config",
      },
    ],
  },
  {
    name: "Profile",
    icon: User,
    route: "profile",
    href: "/profile",
  },
];

const Sidebar = ({ isOpen, onClose, currentRoute }) => {
  const router = useRouter();
  const { userRole, isAcslAgent, isPartnerAgent } = useAuth();
  const { canRoute } = usePermissions();

  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  let navItems = allNavItems
    .filter((item) => canRoute(item.route))
    .map((item) => {
      if (item.route === "partners" && isAcslAgent) {
        return { ...item, name: "My Partners" };
      }
      return item;
    });

  // Specific order for ACSL Agent and Partner Agent
  if (isAcslAgent || isPartnerAgent) {
    const agentOrder = isAcslAgent
      ? ["dashboard", "sales", "partners", 
        // "stove-management", 
        "stove-manager", "profile"]
      : ["dashboard", "sales", "stove-manager", "profile"];
      
    navItems = [...navItems].sort((a, b) => {
      const indexA = agentOrder.indexOf(a.route);
      const indexB = agentOrder.indexOf(b.route);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  const navigateToRoute = (href) => {
    router.push(href);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleOverlayClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isChildActive = (children) => {
    return children?.some((child) => currentRoute === child.route);
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
        className={`fixed top-0 left-0 h-screen z-50 w-64 border-r border-gray-200 flex flex-col
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
            // Items with children render as expandable groups
            if (item.children) {
              const childActive = isChildActive(item.children);
              const isExpanded =
                expandedItems[item.route] !== undefined
                  ? expandedItems[item.route]
                  : childActive; // auto-expand if a child is active

              return (
                <div key={item.route}>
                  {/* Parent item (toggle only, no navigation) */}
                  <button
                    onClick={() => toggleExpand(item.route)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full text-left ${
                      childActive
                        ? "text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-white/50"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Children */}
                  {isExpanded && (
                    <div className="ml-4 pl-4 border-l border-gray-200 space-y-0.5 mt-0.5">
                      {item.children.map((child) => {
                        const isChildRouteActive =
                          currentRoute === child.route;
                        return (
                          <Link
                            key={child.route}
                            href={child.href}
                            onClick={() => navigateToRoute(child.href)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                              isChildRouteActive
                                ? "bg-white text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-white/50"
                            }`}
                          >
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular items (no children)
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
