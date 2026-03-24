// @version 0.9.0 - Lens: admin root redirect to /admin/events
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/events");
}
