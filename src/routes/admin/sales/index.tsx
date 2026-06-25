import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/sales/page";

export const Route = createFileRoute("/admin/sales/")({
  component: Page,
});
