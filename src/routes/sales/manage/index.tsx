import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/sales/manage/page";

export const Route = createFileRoute("/sales/manage/")({
  component: Page,
});
