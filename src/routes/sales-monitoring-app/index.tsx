import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const Page = lazy(() => import("@/app/sales-monitoring-app/page"));

export const Route = createFileRoute("/sales-monitoring-app/")({
  component: Page,
});
