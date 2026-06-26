import { createFileRoute } from "@tanstack/react-router";

function PartnerProfilesPage() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Partner Profiles</h1>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
        No partner profiles to display yet.
      </div>
    </div>
  );
}

export const Route = createFileRoute("/partners/profiles")({
  component: PartnerProfilesPage,
});
