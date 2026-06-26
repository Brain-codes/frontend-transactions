import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/user-management/user-groups/page";

export const Route = createFileRoute("/user-management/user-groups/")({
  component: Page,
});
