"use client";

import { StatsCard } from "@/components/dashboard";
import {
  Target,
  TrendingUp,
  Briefcase,
  CheckSquare,
  XCircle,
  CircleDollarSign,
  Percent,
  DollarSign,
} from "lucide-react";

interface SalesKpiCardsProps {
  totalLeads: number;
  newLeads: number;
  activeDeals: number;
  wonLeads: number;
  lostLeads: number;
  totalRevenue: number;
  convRate: string;
  avgDeal: number;
}

export function SalesKpiCards({
  totalLeads,
  newLeads,
  activeDeals,
  wonLeads,
  lostLeads,
  totalRevenue,
  convRate,
  avgDeal,
}: SalesKpiCardsProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Key Metrics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Leads"
          value={totalLeads}
          icon={Target}
          accentColor="blue"
        />
        <StatsCard
          title="Leads Worked on"
          value={newLeads}
          icon={TrendingUp}
          accentColor="green"
          description="This month"
        />
        <StatsCard
          title="Active Deals"
          value={activeDeals}
          icon={Briefcase}
          accentColor="cyan"
        />
        <StatsCard
          title="Deals Won"
          value={wonLeads}
          icon={CheckSquare}
          accentColor="emerald"
        />
        <StatsCard
          title="Deals Lost"
          value={lostLeads}
          icon={XCircle}
          accentColor="rose"
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${Number(totalRevenue).toLocaleString("en-IN")}`}
          icon={CircleDollarSign}
          accentColor="purple"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${convRate}%`}
          icon={Percent}
          accentColor="amber"
        />
        <StatsCard
          title="Avg Deal Value"
          value={`₹${avgDeal.toLocaleString("en-IN")}`}
          icon={DollarSign}
          accentColor="orange"
        />
      </div>
    </div>
  );
}
