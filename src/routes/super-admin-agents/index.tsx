import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/super-admin-agents/page";

export const Route = createFileRoute("/super-admin-agents/")({
  component: Page,
});
