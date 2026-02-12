import { redirect } from "next/navigation";

/**
 * Legacy test route was removed. Keep /test stable and send users to home.
 */
export default function TestPage() {
  redirect("/");
}
