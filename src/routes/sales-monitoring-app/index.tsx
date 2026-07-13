import { createFileRoute, redirect } from "@tanstack/react-router";

// The download page moved to the shorter, public `/app` route. This route is
// kept only to permanently redirect anyone holding the old link.
export const Route = createFileRoute("/sales-monitoring-app/")({
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
});
