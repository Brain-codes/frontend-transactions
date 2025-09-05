"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import authService from "../services/authService";

const AuthContext = createContext({});

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
  const [profile, setProfile] = useState(null);
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  );

  useEffect(() => {
    const getUser = async () => {
      // Use authService to check auth and profile
      const authResult = await authService.checkAuthAndProfile();
      setUser(authResult.user);
      setProfile(authResult.profile);
      setLoading(false);
    };

    getUser();

    // Use authService for auth state changes to handle profile automatically
    const {
      data: { subscription },
    } = authService.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    // Use authService which handles profile fetching automatically
    const result = await authService.signInWithEmailAndPassword(
      email,
      password
    );

    if (result.success && result.profile) {
      setProfile(result.profile);
    }

    // Return in the expected format for backward compatibility
    return {
      data: result.data,
      error: result.error ? { message: result.error } : null,
    };
  };

  const signOut = async () => {
    // Use authService which handles profile clearing automatically
    const result = await authService.signOut();

    if (result.success) {
      setProfile(null);
    }

    // Return in the expected format for backward compatibility
    return { error: result.error ? { message: result.error } : null };
  };

  const value = {
    user,
    loading,
    profile,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
