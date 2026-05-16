import { redirect } from "next/navigation";

export default function SuperAdminAgentsRedirect() {
  redirect("/agents");
}
