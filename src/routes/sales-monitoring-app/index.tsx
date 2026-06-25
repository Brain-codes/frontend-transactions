import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/sales-monitoring-app/page";

export const Route = createFileRoute("/sales-monitoring-app/")({
  component: Page,
});
