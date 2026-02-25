"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DashboardLayout from "../../../components/DashboardLayout";
import CreateSalesForm from "../../../admin/components/sales/CreateSalesForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SAACreateSalePage() {
  const router = useRouter();

  return (
    <ProtectedRoute allowedRoles={["super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent-sales">
        <div className="p-6 space-y-4">
          <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900 -ml-2">
            <Link href="/super-admin-agent/sales">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales
            </Link>
          </Button>
          <CreateSalesForm
            onSuccess={() => router.push("/super-admin-agent/sales")}
            cancelHref="/super-admin-agent/sales"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
