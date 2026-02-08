import { redirect } from "next/navigation";

/**
 * Test page under main app: redirects to legacy test route.
 * Keeps a real endpoint at /test so Turbopack can build the route tree
 * without panicking (legacy /test was moved to /legacy/workout-plan/test).
 */
export default function TestPage() {
  redirect("/legacy/workout-plan/test");
}
