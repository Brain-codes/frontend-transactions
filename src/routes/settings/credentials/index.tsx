import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/settings/credentials/page";

export const Route = createFileRoute("/settings/credentials/")({
  component: Page,
});
