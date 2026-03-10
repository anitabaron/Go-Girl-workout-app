"use client";

import React from "react";
import { Copy, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CardActionButtonsProps = {
  readonly onEdit?: (e: React.MouseEvent) => void;
  readonly onDuplicate?: (e: React.MouseEvent) => void;
  readonly onDelete: (e: React.MouseEvent) => void;
  readonly editAriaLabel: string;
  readonly duplicateAriaLabel?: string;
  readonly deleteAriaLabel: string;
  readonly editDisabled?: boolean;
  readonly duplicateDisabled?: boolean;
  readonly deleteDisabled?: boolean;
  readonly alwaysVisible?: boolean;
  readonly positionClassName?: string;
};

export function CardActionButtons({
  onEdit,
  onDuplicate,
  onDelete,
  editAriaLabel,
  duplicateAriaLabel = "Duplikuj",
  deleteAriaLabel,
  editDisabled = false,
  duplicateDisabled = false,
  deleteDisabled = false,
  alwaysVisible = false,
  positionClassName = "right-1 top-4",
}: CardActionButtonsProps) {
  return (
    <div
      className={`absolute ${positionClassName} z-10 transition-opacity ${
        alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md border border-transparent hover:border-border hover:bg-accent hover:text-foreground"
          onClick={onEdit}
          disabled={editDisabled || !onEdit}
          aria-label={editAriaLabel}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md border border-transparent hover:border-border hover:bg-accent hover:text-foreground"
          onClick={onDuplicate}
          disabled={duplicateDisabled || !onDuplicate}
          aria-label={duplicateAriaLabel}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md border border-transparent text-destructive hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive"
          onClick={onDelete}
          disabled={deleteDisabled}
          aria-label={deleteAriaLabel}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
