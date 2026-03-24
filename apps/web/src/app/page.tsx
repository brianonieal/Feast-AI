// @version 0.5.0 - Echo: root redirect
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/home");
}
