"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  /** Custom button content (e.g. icon + text). Falls back to actionLabel if not provided. */
  actionContent?: React.ReactNode;
  /** data-test-id attribute for E2E tests */
  testId?: string;
  /** Visual variant: default (primary/destructive) vs muted */
  variant?: "default" | "muted";
};

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  actionContent,
  testId,
  variant = "default",
}: EmptyStateProps) {
  const isMuted = variant === "muted";

  return (
    <Card
      className={
        isMuted
          ? "text-center"
          : "mx-auto min-w-[320px] max-w-md rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-950"
      }
      {...(testId ? { "data-test-id": testId, "data-testid": testId } : {})}
    >
      <CardHeader className={isMuted ? "" : "text-center"}>
        <div
          className={
            isMuted
              ? "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"
              : "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary"
          }
        >
          {icon}
        </div>
        <CardTitle
          className={
            isMuted
              ? "break-words"
              : "text-2xl font-extrabold text-destructive break-words"
          }
        >
          {title}
        </CardTitle>
        <CardDescription
          className={
            isMuted
              ? "break-words"
              : "mt-2 text-zinc-600 dark:text-zinc-400 break-words"
          }
        >
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className={isMuted ? "" : "text-center"}>
        <Button
          asChild
          size="lg"
          variant={isMuted ? "default" : undefined}
          className={
            isMuted
              ? undefined
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          }
          aria-label={actionLabel}
        >
          <Link href={actionHref}>{actionContent ?? actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
