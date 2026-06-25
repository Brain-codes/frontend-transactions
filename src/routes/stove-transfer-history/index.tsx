import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/stove-transfer-history/page";

export const Route = createFileRoute("/stove-transfer-history/")({
  component: Page,
});
