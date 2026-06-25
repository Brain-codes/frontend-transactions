import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/agents/page";

export const Route = createFileRoute("/admin/agents/")({
  component: Page,
});
