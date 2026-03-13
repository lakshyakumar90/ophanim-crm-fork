"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ShieldAlert, Users, AlertTriangle, ExternalLink } from "lucide-react";
import { csvApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DuplicateLead {
  id: string;
  leadName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
}

interface DuplicateGroup {
  email: string | null;
  phone: string | null;
  leads: DuplicateLead[];
}

export default function DuplicateLeadsPage() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const { currentDepartment } = useDepartment();

  const { data, isLoading } = useSWR(
    isAdmin ? "duplicate-leads" : null,
    async () => {
      const res = await csvApi.getDuplicateLeads();
      return (res.data?.data ?? res.data) as { groups: DuplicateGroup[] };
    },
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators can view duplicate leads.
          </p>
        </div>
      </div>
    );
  }

  const groups = data?.groups ?? [];

  const getLeadHref = (leadId: string) => {
    return `/sales/leads/${leadId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Duplicate Leads</h1>
          <p className="text-muted-foreground">
            Leads sharing the same email or phone number
          </p>
        </div>
        {!isLoading && (
          <Badge
            variant={groups.length > 0 ? "destructive" : "outline"}
            className="text-sm px-3 py-1"
          >
            {groups.length} group{groups.length !== 1 ? "s" : ""} found
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">No duplicates found</h3>
          <p className="text-muted-foreground text-sm">
            All leads have unique email addresses and phone numbers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, gi) => (
            <Card key={gi} className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {group.email ? (
                    <>Duplicate email: <span className="font-mono text-amber-700 dark:text-amber-400">{group.email}</span></>
                  ) : (
                    <>Duplicate phone: <span className="font-mono text-amber-700 dark:text-amber-400">{group.phone}</span></>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    {group.leads.length} leads
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.leads.map((lead, li) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.leadName}
                          {li === 0 && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Oldest
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.email || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {lead.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(lead.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => router.push(getLeadHref(lead.id))}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
