import type { ReactNode } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import type { BreadcrumbItemConfig } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

type DetailPageLayoutProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItemConfig[];
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DetailPageLayout({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
  tabs,
  children,
  className,
}: DetailPageLayoutProps) {
  return (
    <PageShell className={cn(className)} fullWidth>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      {tabs}
      <div className="min-w-0">{children}</div>
    </PageShell>
  );
}
