import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDatum } from "@/hooks/sales/useSalesAnalytics";
import { PieLegendChart } from "./PieLegendChart";

interface LeadSourceDistributionCardProps {
  sourceData: ChartDatum[];
}

export function LeadSourceDistributionCard({ sourceData }: LeadSourceDistributionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lead Source Distribution</CardTitle>
        <CardDescription className="text-xs">Lead acquisition mix for selected filters</CardDescription>
      </CardHeader>
      <CardContent>
        <PieLegendChart data={sourceData} />
      </CardContent>
    </Card>
  );
}
