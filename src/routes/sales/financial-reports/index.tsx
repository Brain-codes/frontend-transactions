import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/sales/financial-reports/page";

export const Route = createFileRoute("/sales/financial-reports/")({
  component: Page,
});
