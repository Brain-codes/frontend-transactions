import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/user-management/page";

export const Route = createFileRoute("/user-management/")({
  component: Page,
});
