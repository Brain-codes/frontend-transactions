import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/download/page";

export const Route = createFileRoute("/download/")({
  component: Page,
});
