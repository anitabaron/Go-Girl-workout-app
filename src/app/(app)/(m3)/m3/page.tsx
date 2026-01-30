import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function M3Page() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="m3-headline">Go Girl</h1>
        <p className="m3-body-large mt-2 text-neutral-600 dark:text-neutral-400">
          Material 3 foundation. Neutral surfaces, calm typography, and
          consistent spacing.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="m3-title">Exercises</CardTitle>
            <CardDescription className="m3-body">
              Browse and manage your exercise library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/m3/exercises">Go to Exercises</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="m3-title">Welcome</CardTitle>
            <CardDescription className="m3-body">
              This is the M3 UI foundation. Neutral surfaces, calm typography,
              and consistent spacing.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
