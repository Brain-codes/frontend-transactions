import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/settings/system-config/page";

export const Route = createFileRoute("/settings/system-config/")({
  component: Page,
});
