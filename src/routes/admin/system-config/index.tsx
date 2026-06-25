import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/system-config/page";

export const Route = createFileRoute("/admin/system-config/")({
  component: Page,
});
