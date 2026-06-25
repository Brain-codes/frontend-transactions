import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/settings/tools/page";

export const Route = createFileRoute("/settings/tools/")({
  component: Page,
});
