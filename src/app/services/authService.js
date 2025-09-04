"use client";

// Auth Service for handling login and profile management
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import profileService from "./profileService";

class AuthService {
  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Enhanced login function that fetches and stores profile after login
  async signInWithEmailAndPassword(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          data: null,
        };
      }

      if (data.user) {
        // Fetch and store user profile after successful login
        const profileResult = await profileService.fetchAndStoreProfile();

        if (!profileResult.success) {
          console.warn(
            "Failed to fetch profile after login:",
            profileResult.error
          );
          // Don't fail the login, just warn
        }

        return {
          success: true,
          data: data,
          error: null,
          profile: profileResult.data,
        };
      }

      return {
        success: false,
        error: "Login failed",
        data: null,
      };
    } catch (error) {
      console.error("Error during login:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Enhanced logout function that clears profile data
  async signOut() {
    try {
      // Clear stored profile data
      profileService.clearStoredProfileData();

      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error("Error during logout:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if user is logged in and has profile data
  async checkAuthAndProfile() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        return {
          isAuthenticated: false,
          hasProfile: false,
          user: null,
          profile: null,
        };
      }

      // Check if profile is stored
      const profile = profileService.getStoredProfileData();

      if (!profile) {
        // Try to fetch profile if not stored
        const profileResult = await profileService.fetchAndStoreProfile();

        return {
          isAuthenticated: true,
          hasProfile: profileResult.success,
          user: session.user,
          profile: profileResult.data,
        };
      }

      return {
        isAuthenticated: true,
        hasProfile: true,
        user: session.user,
        profile: profile,
      };
    } catch (error) {
      console.error("Error checking auth and profile:", error);
      return {
        isAuthenticated: false,
        hasProfile: false,
        user: null,
        profile: null,
        error: error.message,
      };
    }
  }

  // Get current session
  async getSession() {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error) {
        return {
          success: false,
          session: null,
          error: error.message,
        };
      }

      return {
        success: true,
        session: session,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        session: null,
        error: error.message,
      };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Fetch profile when user signs in
        await profileService.fetchAndStoreProfile();
      } else if (event === "SIGNED_OUT") {
        // Clear profile when user signs out
        profileService.clearStoredProfileData();
      }

      callback(event, session);
    });
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
