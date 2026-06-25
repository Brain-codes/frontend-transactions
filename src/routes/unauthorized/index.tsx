import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/unauthorized/page";

export const Route = createFileRoute("/unauthorized/")({
  component: Page,
});
