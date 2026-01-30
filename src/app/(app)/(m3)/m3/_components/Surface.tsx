import { cn } from "@/lib/utils";

type SurfaceProps = React.ComponentProps<"section"> & {
  /** Use 'high' for elevated surface (m3-surface-container-high) */
  variant?: "default" | "high";
};

/**
 * M3 section wrapper using surface container styling.
 * Dumb presentational component. Uses existing m3-surface-container classes.
 */
export function Surface({
  variant = "default",
  className,
  children,
  ...props
}: Readonly<SurfaceProps>) {
  return (
    <section
      className={cn(
        "rounded-xl p-4 sm:p-6",
        variant === "high"
          ? "m3-surface-container-high"
          : "m3-surface-container",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
