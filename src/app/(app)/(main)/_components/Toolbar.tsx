import { cn } from "@/lib/utils";

type ToolbarProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * M3 toolbar - layout wrapper for filters/search/actions.
 * Responsive: single column on mobile, row on desktop.
 */
export function Toolbar({ children, className }: Readonly<ToolbarProps>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      role="toolbar"
    >
      {children}
    </div>
  );
}
