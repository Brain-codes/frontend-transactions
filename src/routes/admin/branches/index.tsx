import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/branches/page";

export const Route = createFileRoute("/admin/branches/")({
  component: Page,
});
