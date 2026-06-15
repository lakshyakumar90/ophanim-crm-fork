import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDatum } from "@/hooks/sales/useSalesAnalytics";
import { PieLegendChart } from "./PieLegendChart";

interface LeadStatusDistributionCardProps {
  statusData: ChartDatum[];
}

export function LeadStatusDistributionCard({ statusData }: LeadStatusDistributionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lead Status Distribution</CardTitle>
        <CardDescription className="text-xs">How filtered leads are distributed by status</CardDescription>
      </CardHeader>
      <CardContent>
        <PieLegendChart data={statusData} />
      </CardContent>
    </Card>
  );
}
