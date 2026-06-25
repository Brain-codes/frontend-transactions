import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/docs/admin/page";

export const Route = createFileRoute("/docs/admin/")({
  component: Page,
});
