import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/agent/page";

export const Route = createFileRoute("/agent/")({
  component: Page,
});
