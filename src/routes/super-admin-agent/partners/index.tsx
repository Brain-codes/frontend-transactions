import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/super-admin-agent/partners/page";

export const Route = createFileRoute("/super-admin-agent/partners/")({
  component: Page,
});
