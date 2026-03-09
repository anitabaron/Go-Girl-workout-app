import { redirect } from "next/navigation";

export default async function ProgramsPage() {
  redirect("/workout-plans?section=programs");
}
