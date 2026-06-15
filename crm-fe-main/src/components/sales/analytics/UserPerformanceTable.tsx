import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import type { UserWiseRow } from "@/hooks/sales/useSalesAnalytics";

interface UserPerformanceTableProps {
  userWiseRows: UserWiseRow[];
}

export function UserPerformanceTable({ userWiseRows }: UserPerformanceTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">User Performance Table</CardTitle>
        <CardDescription className="text-xs">
          Total leads, leads worked, conversions, and tracked activity summary
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">User</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Leads Worked</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="text-right">Status Changes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right pr-6">Win Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userWiseRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    No user-wise data for selected filters
                  </TableCell>
                </TableRow>
              )}
              {userWiseRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.fullName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.teamName || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.totalLeads}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.leadsWorked}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversions}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.activitiesLogged}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.statusChanges}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.comments}</TableCell>
                  <TableCell className="text-right tabular-nums pr-6">{row.winRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
