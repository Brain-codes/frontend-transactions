import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/payment-models/page";

export const Route = createFileRoute("/payment-models/")({
  component: Page,
});
