import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/app-config/page";

export const Route = createFileRoute("/admin/app-config/")({
  component: Page,
});
