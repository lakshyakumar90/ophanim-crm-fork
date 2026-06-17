import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import type { BreadcrumbItemConfig } from "@/components/shared/page-header";

type ListPageLayoutProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItemConfig[];
  filters?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ListPageLayout({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
  filters,
  children,
  footer,
  className,
  contentClassName,
}: ListPageLayoutProps) {
  return (
    <PageShell className={className}>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      {filters ? <div className="flex flex-col gap-3">{filters}</div> : null}
      <div className={cn("min-w-0 space-y-6", contentClassName)}>{children}</div>
      {footer}
    </PageShell>
  );
}
