import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/docs/superadmin/page";

export const Route = createFileRoute("/docs/superadmin/")({
  component: Page,
});
