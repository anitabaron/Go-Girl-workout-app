/**
 * Server Component renderujący nagłówek strony z tytułem "Rekordy osobiste".
 */
export function PersonalRecordsHeader() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
        Rekordy osobiste
      </h1>
      <p className="mt-2 text-xl font-semibold text-destructive sm:text-2xl">
        Śledź swoje postępy i osiągnięcia
      </p>
    </div>
  );
}
