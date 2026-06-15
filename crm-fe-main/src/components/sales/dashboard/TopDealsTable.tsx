"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopDealsTableProps {
  topDeals: any[];
  users: any[];
}

export function TopDealsTable({ topDeals, users }: TopDealsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Deals / Opportunities</CardTitle>
        <CardDescription>
          Top 10 highest-value priority deals (Won → Meeting Scheduled → Proposal Sent → Hot Lead)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-3 px-3 font-medium">Lead Name</th>
                <th className="py-3 px-3 font-medium">Website</th>
                <th className="py-3 px-3 font-medium">Email</th>
                <th className="py-3 px-3 font-medium">Status</th>
                <th className="py-3 px-3 font-medium">Owner (assigned to)</th>
              </tr>
            </thead>
            <tbody>
              {topDeals.length > 0 ? (
                topDeals.map((deal: any, i) => {
                  const status = deal.status || "";
                  const statusColor =
                    status === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100" :
                    status === "meeting_scheduled" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100" :
                    status === "proposal_sent" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100" :
                    status === "hot_lead" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";

                  return (
                    <tr
                      key={deal.id || i}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        deal.id
                          ? "hover:bg-muted/40 cursor-pointer"
                          : "hover:bg-muted/20",
                      )}
                    >
                      <td className="py-3 px-3 font-medium">
                        {deal.id ? (
                          <Link
                            href={`/sales/leads/${deal.id}`}
                            className="block -my-3 py-3 text-primary hover:underline"
                          >
                            {deal.leadName || deal.lead_name || "—"}
                          </Link>
                        ) : (
                          deal.leadName || deal.lead_name || "—"
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {deal.website ? (
                          <a
                            href={
                              String(deal.website).startsWith("http")
                                ? deal.website
                                : `https://${deal.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {deal.website}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {deal.id ? (
                          <Link
                            href={`/sales/leads/${deal.id}`}
                            className="block -my-3 py-3"
                          >
                            {deal.email || "—"}
                          </Link>
                        ) : (
                          deal.email || "—"
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {deal.id ? (
                          <Link
                            href={`/sales/leads/${deal.id}`}
                            className="block -my-3 py-3"
                          >
                            <Badge className={cn("capitalize border-0", statusColor)}>
                              {status.replace(/_/g, " ")}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge className={cn("capitalize border-0", statusColor)}>
                            {status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {deal.id ? (
                          <Link
                            href={`/sales/leads/${deal.id}`}
                            className="block -my-3 py-3"
                          >
                            {deal.assignedUser?.fullName ||
                              deal.assigned_user?.full_name ||
                              users.find(
                                (u: any) =>
                                  u.id === (deal.assignedTo || deal.assigned_to),
                              )?.fullName ||
                              users.find(
                                (u: any) =>
                                  u.id === (deal.assignedTo || deal.assigned_to),
                              )?.full_name ||
                              "Unassigned"}
                          </Link>
                        ) : (
                          deal.assignedUser?.fullName ||
                          deal.assigned_user?.full_name ||
                          users.find(
                            (u: any) =>
                              u.id === (deal.assignedTo || deal.assigned_to),
                          )?.fullName ||
                          users.find(
                            (u: any) =>
                              u.id === (deal.assignedTo || deal.assigned_to),
                          )?.full_name ||
                          "Unassigned"
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No priority deals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
