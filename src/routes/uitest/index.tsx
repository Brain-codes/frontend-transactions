import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/uitest/page";

export const Route = createFileRoute("/uitest/")({
  component: Page,
});
