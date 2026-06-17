import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function DashboardPageHeader({
  title,
  description,
  icon,
  actions,
}: DashboardPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      icon={icon}
      actions={actions}
    />
  );
}
