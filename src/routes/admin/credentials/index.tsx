import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/admin/credentials/page";

export const Route = createFileRoute("/admin/credentials/")({
  component: Page,
});
