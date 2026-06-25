import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/super-admin-agent/stove-ids/page";

export const Route = createFileRoute("/super-admin-agent/stove-ids/")({
  component: Page,
});
