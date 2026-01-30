import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * M3 page header - title, optional description, optional actions slot.
 * Dumb presentational component. Uses shadcn + Tailwind only.
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
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="m3-headline">{title}</h1>
        {description && (
          <p className="m3-body mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 sm:mt-0">{actions}</div>}
    </header>
  );
}
