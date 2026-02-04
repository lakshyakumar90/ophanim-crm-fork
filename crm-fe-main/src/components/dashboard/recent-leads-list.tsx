import Link from "next/link";
import { formatDistanceToNowIST } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface Lead {
  id: string;
  leadName: string;
  businessName?: string;
  status: string;
  assignedTo?: {
    fullName: string;
  };
  assignee?: {
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface RecentLeadsListProps {
  leads: Lead[];
}

const statusColors: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  interested:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  follow_up:
    "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  customer: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  dnp: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function RecentLeadsList({ leads }: RecentLeadsListProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Recent Leads</h3>
          <p className="text-sm text-muted-foreground">Latest lead activity</p>
        </div>
        <Link
          href="/sales/leads"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-1">
        {leads.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No recent leads
          </p>
        ) : (
          leads.slice(0, 5).map((lead) => {
            const isNew =
              new Date().getTime() - new Date(lead.createdAt).getTime() <
              24 * 60 * 60 * 1000;
            return (
              <Link
                key={lead.id}
                href={`/sales/leads/${lead.id}`}
                className="flex items-center justify-between py-3 px-2 hover:bg-muted rounded-lg transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {lead.leadName || lead.businessName || "Unnamed Lead"}
                    </p>
                    {isNew && (
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-5 px-1.5">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      className={
                        statusColors[lead.status] ||
                        "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                      }
                      variant="secondary"
                    >
                      {lead.status.replace(/_/g, " ")}
                    </Badge>
                    {(lead.assignee || lead.assignedTo) && (
                      <span className="text-xs text-muted-foreground">
                        • {lead.assignee?.fullName || lead.assignedTo?.fullName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNowIST(lead.updatedAt, {
                    addSuffix: true,
                  })}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
