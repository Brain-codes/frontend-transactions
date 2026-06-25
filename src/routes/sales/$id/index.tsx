import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/sales/[id]/page";

export const Route = createFileRoute("/sales/$id/")({
  component: Page,
});
