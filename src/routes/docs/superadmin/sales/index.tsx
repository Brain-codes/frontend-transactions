import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/docs/superadmin/sales/page";

export const Route = createFileRoute("/docs/superadmin/sales/")({
  component: Page,
});
