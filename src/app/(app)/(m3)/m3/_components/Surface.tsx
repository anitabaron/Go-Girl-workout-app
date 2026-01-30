import { cn } from "@/lib/utils";

type SurfaceProps = React.ComponentProps<"section"> & {
  /** Use 'high' for elevated surface; 'hero' for large hero surface with soft shadow */
  variant?: "default" | "high" | "hero";
};

/**
 * M3 section wrapper - expressive radius and elevation.
 * Uses m3-radius-hero and m3-shadow tokens.
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
        "p-4 sm:p-6 md:p-8",
        variant === "hero" && "m3-surface-hero",
        variant === "high" && "m3-surface-container-high",
        variant === "default" && "m3-surface-container",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
