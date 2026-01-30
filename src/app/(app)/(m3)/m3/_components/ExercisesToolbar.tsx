"use client";

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

/**
 * Exercises toolbar - search + sort. UI only (no backend wiring yet).
 */
export function ExercisesToolbar() {
  return (
    <Toolbar>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search exercises..."
          className="pl-9"
          aria-label="Search exercises"
        />
      </div>
      <Select defaultValue="title-asc">
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Sort by">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="title-asc">Title (A–Z)</SelectItem>
          <SelectItem value="title-desc">Title (Z–A)</SelectItem>
          <SelectItem value="created-desc">Newest first</SelectItem>
          <SelectItem value="created-asc">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </Toolbar>
  );
}
