import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/agents/page";

export const Route = createFileRoute("/agents/")({
  component: Page,
});
