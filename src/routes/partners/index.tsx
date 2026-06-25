import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/partners/page";

export const Route = createFileRoute("/partners/")({
  component: Page,
});
