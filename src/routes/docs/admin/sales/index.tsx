import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/docs/admin/sales/page";

export const Route = createFileRoute("/docs/admin/sales/")({
  component: Page,
});
