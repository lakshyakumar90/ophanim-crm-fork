import {
  CheckSquare,
  DollarSign,
  Percent,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { OverviewMetrics } from "@/hooks/sales/useSalesAnalytics";
import { MetricCard } from "./MetricCard";
import { SectionLabel } from "./SectionLabel";
import { fmtCurrency } from "./utils";

interface OverviewKpisSectionProps {
  overview: OverviewMetrics;
}

export function OverviewKpisSection({ overview }: OverviewKpisSectionProps) {
  return (
    <section>
      <SectionLabel>Overview KPIs</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Leads" value={overview.total} icon={Target} tone="blue" />
        <MetricCard label="Deals Won" value={overview.wonCount} icon={CheckSquare} tone="emerald" />
        <MetricCard label="Deals Lost" value={overview.lostCount} icon={XCircle} tone="rose" />
        <MetricCard label="Revenue Won" value={fmtCurrency(overview.wonValue)} icon={DollarSign} tone="violet" />
        <MetricCard label="Win Rate" value={`${overview.conversionRate.toFixed(1)}%`} icon={Percent} tone="amber" />
        <MetricCard
          label="Avg Deal Size"
          value={fmtCurrency(overview.wonCount > 0 ? overview.wonValue / overview.wonCount : 0)}
          icon={TrendingUp}
          tone="cyan"
        />
      </div>
    </section>
  );
}
