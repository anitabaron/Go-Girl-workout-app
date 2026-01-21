export function formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return "-";
    return `${seconds}s`;
  }
  
  export function formatTotalDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}min`;
    }
    return `${minutes}min ${remainingSeconds}s`;
  }