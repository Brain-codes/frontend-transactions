import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/stove-management/page";

export const Route = createFileRoute("/stove-management/")({
  component: Page,
});
