import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/super-admin-agent/sales/page";

export const Route = createFileRoute("/super-admin-agent/sales/")({
  component: Page,
});
