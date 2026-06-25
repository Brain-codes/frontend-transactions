import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/partner-agents/page";

export const Route = createFileRoute("/admin/partner-agents/")({
  component: Page,
});
