import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/stove-manager/page";

export const Route = createFileRoute("/stove-manager/")({
  component: Page,
});
