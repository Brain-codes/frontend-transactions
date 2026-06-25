import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/settings/user-management/page";

export const Route = createFileRoute("/settings/user-management/")({
  component: Page,
});
