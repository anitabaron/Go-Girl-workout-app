import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * M3 Expressive page header - bold headline, supporting text, actions aligned.
 * Clear hierarchy for section pages.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="m3-hero-sm">{title}</h1>
        {description && (
          <p className="m3-body m3-prose text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 sm:mt-0">{actions}</div>}
    </header>
  );
}
