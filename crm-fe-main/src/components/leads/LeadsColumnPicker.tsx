"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { ALL_COLUMNS } from "@/components/leads/leads-list-constants";

interface LeadsColumnPickerProps {
  visibleColumns: string[];
  onToggleColumn: (key: string) => void;
}

export function LeadsColumnPicker({
  visibleColumns,
  onToggleColumn,
}: LeadsColumnPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px] h-[300px] overflow-y-auto"
      >
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ALL_COLUMNS.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visibleColumns.includes(col.key)}
            onCheckedChange={() => onToggleColumn(col.key)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
