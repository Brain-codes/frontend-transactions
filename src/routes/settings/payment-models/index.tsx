import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/settings/payment-models/page";

export const Route = createFileRoute("/settings/payment-models/")({
  component: Page,
});
