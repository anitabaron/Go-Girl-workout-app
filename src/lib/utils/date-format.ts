export function formatDate(dateString: string): Readonly<string> {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  export function formatDateTime(dateString: string | null | undefined): Readonly<string> {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
