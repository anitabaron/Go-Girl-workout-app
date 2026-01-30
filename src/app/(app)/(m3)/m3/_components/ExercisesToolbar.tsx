"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toolbar } from "./Toolbar";

const SORT_OPTIONS = [
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
  { value: "created-desc", label: "Newest first" },
  { value: "created-asc", label: "Oldest first" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSortValue(sort?: string, order?: string): SortValue {
  if (sort === "title" && order === "asc") return "title-asc";
  if (sort === "title" && order === "desc") return "title-desc";
  if (sort === "created_at" && order === "desc") return "created-desc";
  if (sort === "created_at" && order === "asc") return "created-asc";
  return "title-asc";
}

function sortValueToParams(value: SortValue): { sort: string; order: string } {
  const [sort, order] = value.split("-") as [string, string];
  return {
    sort: sort === "created" ? "created_at" : sort,
    order: order ?? "asc",
  };
}

type ExercisesToolbarProps = {
  search?: string;
  sort?: string;
  order?: string;
};

/**
 * Exercises toolbar - search + sort. Updates URL; page re-renders with new data.
 */
export function ExercisesToolbar({
  search = "",
  sort = "title",
  order = "asc",
}: ExercisesToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const sortValue = parseSortValue(sort, order);

  const updateParams = useCallback(
    (updates: { search?: string; sort?: string; order?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.search !== undefined) {
        if (updates.search) params.set("search", updates.search);
        else params.delete("search");
      }
      if (updates.sort !== undefined) params.set("sort", updates.sort);
      if (updates.order !== undefined) params.set("order", updates.order);
      startTransition(() => {
        router.push(`/m3/exercises?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleSortChange = (value: SortValue) => {
    const { sort: s, order: o } = sortValueToParams(value);
    updateParams({ sort: s, order: o });
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        updateParams({ search: value || undefined });
      }, 300);
    },
    [updateParams],
  );

  return (
    <Toolbar className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-highest)] p-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          key={`search-${search}-${sort}-${order}`}
          type="search"
          placeholder="Search exercises..."
          className="pl-9"
          aria-label="Search exercises"
          defaultValue={search}
          onChange={handleSearchChange}
          disabled={isPending}
        />
      </div>
      <Select value={sortValue} onValueChange={handleSortChange} disabled={isPending}>
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Sort by">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Toolbar>
  );
}
