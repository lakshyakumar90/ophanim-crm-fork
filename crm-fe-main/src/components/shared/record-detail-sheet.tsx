"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { BreadcrumbItemConfig } from "@/components/shared/page-header";

type RecordDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  breadcrumbs?: BreadcrumbItemConfig[];
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Wider panel for content-heavy records (e.g. leads). */
  size?: "default" | "wide";
};

const sheetWidthClasses = {
  default:
    "data-[side=right]:w-full data-[side=right]:max-w-full sm:data-[side=right]:w-[min(90vw,100%)] sm:data-[side=right]:max-w-[min(90vw,100%)] md:data-[side=right]:w-[min(82vw,100%)] md:data-[side=right]:max-w-[min(82vw,100%)] lg:data-[side=right]:w-[min(70vw,68rem)] lg:data-[side=right]:max-w-[min(70vw,68rem)]",
  wide:
    "data-[side=right]:w-full data-[side=right]:max-w-full sm:data-[side=right]:w-[min(96vw,100%)] sm:data-[side=right]:max-w-[min(96vw,100%)] md:data-[side=right]:w-[min(92vw,100%)] md:data-[side=right]:max-w-[min(92vw,100%)] lg:data-[side=right]:w-[min(85vw,72rem)] lg:data-[side=right]:max-w-[min(85vw,72rem)] xl:data-[side=right]:w-[min(80vw,80rem)] xl:data-[side=right]:max-w-[min(80vw,80rem)]",
} as const;

export function RecordDetailSheet({
  open,
  onOpenChange,
  title,
  breadcrumbs,
  actions,
  children,
  className,
  size = "default",
}: RecordDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col gap-0 p-0 transition-interactive",
          sheetWidthClasses[size],
          className,
        )}
      >
        <SheetHeader className="shrink-0 space-y-2 border-b px-4 py-3">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumb>
              <BreadcrumbList className="text-xs">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="contents">
                    {index > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem>
                      {crumb.href && index < breadcrumbs.length - 1 ? (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </SheetHeader>
        <div className="@container min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
