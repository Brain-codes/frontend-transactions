"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AgentDashboardPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/sales");
  }, [router]);

  return null;
};

export default AgentDashboardPage;
