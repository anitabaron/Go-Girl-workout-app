import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
};

/**
 * M3 empty state - centered placeholder when no content.
 * Dumb presentational component.
 */
export function EmptyState({
  title,
  description,
  icon,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="text-muted-foreground [&_svg]:size-12">{icon}</div>
      )}
      <div className="space-y-1">
        <p className="m3-title">{title}</p>
        {description && (
          <p className="m3-body text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
