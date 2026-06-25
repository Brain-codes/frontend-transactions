import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/super-admin-agent/page";

export const Route = createFileRoute("/super-admin-agent/")({
  component: Page,
});
