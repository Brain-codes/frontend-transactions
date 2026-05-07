import { redirect } from "next/navigation";

export default function AdminAgentsRedirect() {
  redirect("/agents");
}
