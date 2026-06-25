import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/sales/create/page";

export const Route = createFileRoute("/admin/sales/create/")({
  component: Page,
});
