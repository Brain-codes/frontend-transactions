"use client";

import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isAuthenticated, isSuperAdmin, isSuperAdminAgent, isAcslAgent, isAdmin, isPartner, isAgent, isPartnerAgent, loading } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (isSuperAdmin) {
        router.push("/dashboard");
      } else if (isAcslAgent || isSuperAdminAgent) {
        router.push("/super-admin-agent");
      } else if (isPartner || isAdmin) {
        router.push("/admin");
      } else if (isPartnerAgent || isAgent) {
        router.push("/admin/sales");
      } else {
        router.push("/unauthorized");
      }
    }
  }, [isAuthenticated, isSuperAdmin, isSuperAdminAgent, isAcslAgent, isAdmin, isPartner, isAgent, isPartnerAgent, loading, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700"></div>
    </div>
  );
}
