import Link from "next/link";
import type { ComponentType } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type Feature = {
  id: string;
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string; // Opcjonalny link do sekcji
};

type FeatureCardProps = {
  readonly feature: Feature;
};

/**
 * Server Component renderujący kartę pojedynczej funkcji aplikacji z ikoną, tytułem i opisem.
 */
export function FeatureCard({ feature }: FeatureCardProps) {
  const content = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        {feature.icon && (
          <div className="mb-2">
            <feature.icon className="h-6 w-6 text-primary" />
          </div>
        )}
        <CardTitle className="text-lg">{feature.title}</CardTitle>
        <CardDescription>{feature.description}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (feature.href) {
    return (
      <Link
        href={feature.href}
        className="block h-full"
        aria-label={`Przejdź do ${feature.title}`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
