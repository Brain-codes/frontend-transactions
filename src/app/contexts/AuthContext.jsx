"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import profileService from "../services/profileService";
import tokenManager from "../../utils/tokenManager";

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

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);

      // If user is already logged in, ensure profile data is available
      if (session?.user) {
        // Store session data in tokenManager
        if (session) {
          console.log('🔐 [AuthContext] Storing session data in tokenManager');
          tokenManager.setLoginData(session);
        }

        const storedProfile = profileService.getStoredProfileData();
        if (!storedProfile) {
          try {
            const profileResponse = await profileService.fetchAndStoreProfile();
            if (!profileResponse.success) {
              console.warn(
                "Failed to fetch user profile on session restore:",
                profileResponse.error
              );
            }
          } catch (profileError) {
            console.error(
              "Error fetching profile on session restore:",
              profileError
            );
          }
        }
      }

      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);

      // Handle auth state changes
      if (event === "SIGNED_IN" && session?.user) {
        // Store session data in tokenManager
        console.log('🔐 [AuthContext] Storing login session in tokenManager');
        tokenManager.setLoginData(session);

        // Fetch profile on sign in
        try {
          const profileResponse = await profileService.fetchAndStoreProfile();
          if (!profileResponse.success) {
            console.warn(
              "Failed to fetch user profile on sign in:",
              profileResponse.error
            );
          }
        } catch (profileError) {
          console.error("Error fetching profile on sign in:", profileError);
        }
      } else if (event === "SIGNED_OUT") {
        // Clear profile and token data on sign out
        profileService.clearStoredProfileData();
        tokenManager.clearToken();
      }

      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If login is successful, fetch and store user profile
    if (data?.user && !error) {
      // Store session data in tokenManager
      if (data.session) {
        console.log('🔐 [AuthContext] Storing login response in tokenManager');
        tokenManager.setLoginData(data.session);
      }

      try {
        const profileResponse = await profileService.fetchAndStoreProfile();
        if (!profileResponse.success) {
          console.warn("Failed to fetch user profile:", profileResponse.error);
        }
      } catch (profileError) {
        console.error("Error fetching profile after login:", profileError);
      }
    }

    return { data, error };
  };

  const signOut = async () => {
    // Clear stored profile data and token before signing out
    profileService.clearStoredProfileData();
    tokenManager.clearToken();

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isAgent,
    hasAdminAccess,
    signIn,
    signOut,
    supabase,
    // Profile-related methods
    getStoredProfile: () => profileService.getStoredProfileData(),
    getOrganizationId: () => profileService.getOrganizationId(),
    getUserDetails: () => profileService.getUserDetails(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
