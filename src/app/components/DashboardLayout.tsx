"use client";

import React from "react"
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useSidebar } from "../contexts/SidebarContext";
import Sidebar from "./Sidebar.jsx";
import TopNavigation from "./TopNavigation";

type DashboardLayoutProps = {
  children?: React.ReactNode;
  currentRoute?: string;
  title?: string;
  description?: string;
  rightButton?: React.ReactNode;
};

const DashboardLayout = ({
  children,
  currentRoute = "dashboard",
  title = "Dashboard",
  description = "Welcome to your dashboard",
  rightButton = null,
} : DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        currentRoute={currentRoute}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${sidebarOpen ? "ml-0 lg:ml-72" : "ml-0 lg:ml-0"}`}
      >
        <TopNavigation
          onToggleSidebar={toggleSidebar}
          title={title}
          description={description}
          rightButton={rightButton}
          user={user}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
