import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/map/page";

export const Route = createFileRoute("/map/")({
  component: Page,
});
