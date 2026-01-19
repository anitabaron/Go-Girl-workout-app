import type { ReactNode } from "react";

type PageHeaderSectionProps = {
  readonly title?: string;
  readonly description?: string;
  readonly actionButton?: ReactNode;
  readonly children?: ReactNode;
};

/**
 * Wspólny komponent dla sekcji header na stronach aplikacji.
 * Zapewnia spójny wygląd i łatwe zarządzanie padding-top na mobile/desktop.
 * 
 * @param title - Tytuł strony (opcjonalny, jeśli używane są children)
 * @param description - Opis strony (opcjonalny)
 * @param actionButton - Przycisk akcji wyświetlany po prawej stronie (opcjonalny)
 * @param children - Własna zawartość header (opcjonalna, zastępuje title/description)
 */
export function PageHeaderSection({
  title,
  description,
  actionButton,
  children,
}: Readonly<PageHeaderSectionProps>) {
  // Jeśli są children, użyj ich zamiast title/description
  const content = children ?? (
    <div>
      {title && (
        <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
          {title}
        </h1>
      )}
      {description && (
        <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
          {description}
        </p>
      )}
    </div>
  );

  return (
    <header className="bg-primary pt-0 md:pt-[34px]">
      <div className="mx-auto w-full max-w-5xl px-6 pt-[52px] pb-8 sm:px-10">
        {actionButton ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {content}
            {actionButton}
          </div>
        ) : (
          content
        )}
      </div>
    </header>
  );
}
