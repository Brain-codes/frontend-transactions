import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/agreement-images/page";

export const Route = createFileRoute("/agreement-images/")({
  component: Page,
});
