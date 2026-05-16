import { redirect } from "next/navigation";

export default function UserManagementRedirect() {
  redirect("/settings/user-management");
}
