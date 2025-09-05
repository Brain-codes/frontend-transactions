"use client";

import { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set sidebar open by default on desktop
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen((prev) => {
        // Only update state if it needs to change based on screen size
        if (isDesktop && !prev) {
          return true; // Open on desktop if closed
        } else if (!isDesktop && prev) {
          return false; // Close on mobile if open
        }
        return prev; // Keep current state
      });
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      // On desktop, always ensure it stays open unless manually toggled
      if (window.innerWidth >= 1024) {
        return !prev;
      }
      // On mobile, normal toggle behavior
      return !prev;
    });
  };

  const closeSidebar = () => {
    // Only close on mobile or when explicitly needed
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const forceCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        forceCloseSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
