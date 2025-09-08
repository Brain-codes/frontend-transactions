"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
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

  // Track the last user to detect actual user changes vs session refresh
  const lastUserRef = useRef(null);

  // Expose supabase client and load debug utilities
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.supabase = supabase;

      // Dynamically import debug utilities (client-side only)
      import("../../utils/authDebug")
        .then(() => {
          console.log(
            "🔧 Enhanced auth debugging loaded. Run debugAuth.getDebugInfo() for help."
          );
        })
        .catch(() => {
          // Fallback simple debug if import fails
          window.debugAuth = {
            clearAuthStorage: () => {
              const keys = Object.keys(localStorage).filter(
                (key) =>
                  key.includes("supabase") ||
                  key.includes("auth") ||
                  key.includes("transaction")
              );
              keys.forEach((key) => localStorage.removeItem(key));
              console.log("✅ Auth storage cleared");
            },
          };
        });
    }
  }, [supabase]);

  // Debug function to check localStorage state
  const checkLocalStorageAuth = () => {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage).filter(
        (key) => key.includes("supabase") || key.includes("auth")
      );
      console.log("🔐 [AuthContext] LocalStorage auth keys:", keys);

      // Check for the specific Supabase auth token
      const authKey = keys.find((key) => key.includes("supabase.auth.token"));
      if (authKey) {
        try {
          const authData = JSON.parse(localStorage.getItem(authKey));
          const isExpired = authData?.expires_at
            ? authData.expires_at * 1000 < Date.now()
            : false;

          console.log("🔐 [AuthContext] Auth token in localStorage:", {
            hasAccessToken: !!authData?.access_token,
            hasRefreshToken: !!authData?.refresh_token,
            expiresAt: authData?.expires_at
              ? new Date(authData.expires_at * 1000).toISOString()
              : "No expiry",
            isExpired,
          });

          // Auto-cleanup corrupted or expired tokens
          if (
            !authData?.access_token ||
            !authData?.refresh_token ||
            isExpired
          ) {
            console.warn(
              "🔐 [AuthContext] Removing corrupted/expired auth token"
            );
            localStorage.removeItem(authKey);
            return true; // Indicates cleanup happened
          }
        } catch (e) {
          console.log(
            "🔐 [AuthContext] Could not parse auth token from localStorage - removing it"
          );
          localStorage.removeItem(authKey);
          return true; // Indicates cleanup happened
        }
      } else {
        console.log(
          "🔐 [AuthContext] No Supabase auth token found in localStorage"
        );
      }
    }
    return false; // No cleanup needed
  };

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
      try {
        console.log("🔐 [AuthContext] Getting initial session...");

        // Check localStorage state as suggested in the debugging guide
        const cleanupHappened = checkLocalStorageAuth();
        if (cleanupHappened) {
          console.log("🔐 [AuthContext] Corrupted auth data was cleaned up");
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // Debug logging as suggested in the message
        console.log("🔐 [AuthContext] Session data:", {
          session: session ? "Present" : "None",
          user: session?.user?.email || "No user",
          error: error?.message || "No error",
        });

        setUser(session?.user || null);

        // If user is already logged in, ensure profile data is available
        if (session?.user) {
          // Store session data in tokenManager
          if (session) {
            console.log(
              "🔐 [AuthContext] Storing session data in tokenManager"
            );
            tokenManager.setLoginData(session);
          }

          const storedProfile = profileService.getStoredProfileData();
          if (!storedProfile) {
            try {
              // Add timeout to profile fetch to prevent hanging
              const profilePromise = profileService.fetchAndStoreProfile();
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Profile fetch timeout")),
                  8000
                )
              );

              const profileResponse = await Promise.race([
                profilePromise,
                timeoutPromise,
              ]);
              if (!profileResponse.success) {
                console.warn(
                  "Failed to fetch user profile on session restore:",
                  profileResponse.error
                );
              }
            } catch (profileError) {
              console.error(
                "Error fetching profile on session restore:",
                profileError.message || profileError
              );
              // Continue with auth even if profile fetch fails
            }
          }
        } else {
          console.log(
            "🔐 [AuthContext] No session found - user needs to log in"
          );
        }
      } catch (error) {
        console.error("🔐 [AuthContext] Error getting session:", error);
        setUser(null);
      } finally {
        console.log("🔐 [AuthContext] Setting loading to false");
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUserId = session?.user?.id || null;
      const lastUserId = lastUserRef.current?.id || null;
      const isNewUser = sessionUserId !== lastUserId;

      // Only log significant events, not session validation noise
      if (isNewUser || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        console.log("🔐 [AuthContext] Significant auth state change:", {
          event,
          isNewUser,
          userEmail: session?.user?.email || "No user",
          wasUser: lastUserRef.current?.email || "None",
        });
      } else {
        console.log("🔐 [AuthContext] Session validation:", { event });
      }

      // Update user state only if actually different OR if this is a significant event
      const newUser = session?.user || null;
      const oldUserId = user?.id || null;
      const newUserId = newUser?.id || null;

      const hasUserChanged =
        oldUserId !== newUserId || (!user && newUser) || (user && !newUser);

      const isSignificantEvent =
        isNewUser || event === "SIGNED_OUT" || event === "INITIAL_SESSION";

      if (hasUserChanged && isSignificantEvent) {
        console.log("🔐 [AuthContext] User state actually changed, updating", {
          oldId: oldUserId,
          newId: newUserId,
          event,
          isSignificantEvent,
        });
        setUser(newUser);
      } else {
        console.log("🔐 [AuthContext] Skipping state update", {
          userId: oldUserId,
          event,
          hasUserChanged,
          isSignificantEvent,
        });
      }

      // Update last user reference
      lastUserRef.current = session?.user || null;

      // Handle auth state changes - only for significant events
      if (event === "SIGNED_IN" && session?.user && isNewUser) {
        // Store session data in tokenManager
        console.log("🔐 [AuthContext] Storing login session in tokenManager");
        tokenManager.setLoginData(session);

        // Fetch profile on sign in with timeout protection
        try {
          const profilePromise = profileService.fetchAndStoreProfile();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
          );

          const profileResponse = await Promise.race([
            profilePromise,
            timeoutPromise,
          ]);
          if (!profileResponse.success) {
            console.warn(
              "Failed to fetch user profile on sign in:",
              profileResponse.error
            );
          }
        } catch (profileError) {
          console.error(
            "Error fetching profile on sign in:",
            profileError.message || profileError
          );
          // Continue with auth even if profile fetch fails
        }
      } else if (event === "SIGNED_OUT") {
        // Clear profile and token data on sign out
        profileService.clearStoredProfileData();
        tokenManager.clearToken();
      }

      console.log(
        "🔐 [AuthContext] Auth state change complete, setting loading to false"
      );
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
        console.log("🔐 [AuthContext] Storing login response in tokenManager");
        tokenManager.setLoginData(data.session);
      }

      try {
        // Add timeout to profile fetch to prevent hanging
        const profilePromise = profileService.fetchAndStoreProfile();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
        );

        const profileResponse = await Promise.race([
          profilePromise,
          timeoutPromise,
        ]);
        if (!profileResponse.success) {
          console.warn("Failed to fetch user profile:", profileResponse.error);
        }
      } catch (profileError) {
        console.error(
          "Error fetching profile after login:",
          profileError.message || profileError
        );
        // Continue with auth even if profile fetch fails
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
