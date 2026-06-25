import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/sales/page";

export const Route = createFileRoute("/sales/")({
  component: Page,
});
