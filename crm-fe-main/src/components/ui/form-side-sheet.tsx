"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type FormSideSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** sm | md | lg | xl | 2xl | 3xl — maps to max-width on the panel */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<FormSideSheetProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
  "2xl": "sm:max-w-3xl",
  "3xl": "sm:max-w-4xl",
};

export function FormSideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "lg",
  className,
}: FormSideSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full w-full flex-col gap-0 p-0 sm:w-[min(100%,42rem)]",
          SIZE_CLASS[size],
          className,
        )}
      >
        <SheetHeader className="shrink-0 gap-1 border-b px-6 py-5">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
