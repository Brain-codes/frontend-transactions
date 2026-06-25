import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/sales/financial-reports/page";

export const Route = createFileRoute("/admin/sales/financial-reports/")({
  component: Page,
});
