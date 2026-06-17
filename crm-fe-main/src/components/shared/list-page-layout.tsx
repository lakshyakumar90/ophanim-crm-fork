import type { ReactNode } from "react";
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
}: ListPageLayoutProps) {
  return (
    <PageShell>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      {filters ? <div className="flex flex-col gap-3">{filters}</div> : null}
      <div className="min-w-0">{children}</div>
      {footer}
    </PageShell>
  );
}
