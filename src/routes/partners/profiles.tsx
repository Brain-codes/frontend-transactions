import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import DashboardLayout from "@/app/components/DashboardLayout";
import SectionHeader from "@/app/components/SectionHeader";

function PartnerProfilesPage() {
  return (
    <ProtectedRoute requiredRoute="partners-profiles">
      <DashboardLayout>
        <div className="p-6">
          <SectionHeader title="Partner Profiles" />
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            No partner profiles to display yet.
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/partners/profiles")({
  component: PartnerProfilesPage,
});
