import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/profile/page";

export const Route = createFileRoute("/profile/")({
  component: Page,
});
