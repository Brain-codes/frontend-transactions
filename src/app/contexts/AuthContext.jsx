"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const supabase = createClientComponentClient();

  const isAuthenticated = !!user;
  const isSuperAdmin =
    user?.app_metadata?.role === "super_admin" ||
    user?.user_metadata?.role === "super_admin";
  const isAdmin =
    user?.app_metadata?.role === "admin" ||
    user?.user_metadata?.role === "admin";
  const isAgent =
    user?.app_metadata?.role === "agent" ||
    user?.user_metadata?.role === "agent";

  // Helper function to check if user has admin level access (admin or super_admin)
  const hasAdminAccess = isSuperAdmin || isAdmin;

  // Enhanced session management with error handling
  const getSession = async (retryCount = 0) => {
    try {
      setAuthError(null);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        
        // Handle specific auth errors
        if (error.message?.includes("refresh_token_not_found") || 
            error.message?.includes("Invalid Refresh Token")) {
          // Clear any corrupted session data
          await supabase.auth.signOut();
          setUser(null);
          setAuthError("Session expired. Please log in again.");
          setLoading(false);
          return;
        }
        
        // Retry logic for network issues
        if (retryCount < 2 && error.message?.includes("fetch")) {
          console.log(`Retrying session fetch (attempt ${retryCount + 1})`);
          setTimeout(() => getSession(retryCount + 1), 1000);
          return;
        }
        
        setAuthError(error.message);
      }

      setUser(session?.user || null);
    } catch (err) {
      console.error("Session fetch error:", err);
      setAuthError("Authentication service unavailable");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      setAuthError("Configuration error: Missing authentication settings");
      setLoading(false);
      return;
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_OUT':
          setUser(null);
          setAuthError(null);
          break;
        case 'TOKEN_REFRESHED':
          setUser(session?.user || null);
          setAuthError(null);
          break;
        case 'SIGNED_IN':
          setUser(session?.user || null);
          setAuthError(null);
          break;
        default:
          setUser(session?.user || null);
      }
      
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email, password) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setAuthError(error.message);
      }
      
      return { data, error };
    } catch (err) {
      const errorMsg = "Sign in failed. Please try again.";
      setAuthError(errorMsg);
      return { data: null, error: { message: errorMsg } };
    }
  };

  const signOut = async () => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setAuthError(error.message);
      }
      
      return { error };
    } catch (err) {
      const errorMsg = "Sign out failed. Please try again.";
      setAuthError(errorMsg);
      return { error: { message: errorMsg } };
    }
  };

  // Clear auth error manually
  const clearAuthError = () => {
    setAuthError(null);
  };

  const value = {
    user,
    loading,
    authError,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isAgent,
    hasAdminAccess,
    signIn,
    signOut,
    clearAuthError,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
