"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Gift, Plus, UserPlus } from "lucide-react";
import { benefitsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { CreateBenefitPlanModal } from "@/components/hr/benefits/CreateBenefitPlanModal";
import { EnrollBenefitModal } from "@/components/hr/benefits/EnrollBenefitModal";

export default function BenefitsPage() {
  const { user, can } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const isHrView = can("benefits:view") || can("benefits:manage") || can("hr:manage");
  const canManage = can("benefits:manage") || can("hr:manage");

  const { data: plans, isLoading: plansLoading, mutate: mutatePlans } = useSWR(
    user ? ["benefit-plans"] : null,
    () => benefitsApi.listPlans({ limit: 50 }),
  );

  const { data: myEnrollments, isLoading: enrollLoading, mutate: mutateEnroll } = useSWR(
    user && !isHrView ? ["my-benefit-enrollments"] : null,
    () => benefitsApi.getMyEnrollments(),
  );

  const { data: enrollments, mutate: mutateAllEnroll } = useSWR(
    user && isHrView ? ["benefit-enrollments"] : null,
    () => benefitsApi.listEnrollments({ limit: 50 }),
  );

  const planList = Array.isArray(plans) ? plans : (plans as any)?.data ?? [];
  const enrollmentList = isHrView
    ? Array.isArray(enrollments)
      ? enrollments
      : (enrollments as any)?.data ?? []
    : Array.isArray(myEnrollments)
      ? myEnrollments
      : (myEnrollments as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([mutatePlans(), mutateEnroll(), mutateAllEnroll()]);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutatePlans, mutateEnroll, mutateAllEnroll]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const isLoading = plansLoading || enrollLoading;

  const refreshAll = async () => {
    await Promise.all([mutatePlans(), mutateEnroll(), mutateAllEnroll()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Gift className="h-6 w-6 text-primary" />
            Benefits
          </h1>
          <p className="text-muted-foreground">
            {isHrView ? "Manage benefit plans and enrollments" : "Your benefit enrollments"}
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setEnrollOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Enroll employee
            </Button>
            <Button className="gap-2" onClick={() => setCreatePlanOpen(true)}>
              <Plus className="h-4 w-4" />
              Create plan
            </Button>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Available Plans</h2>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : planList.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No benefit plans available
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {planList.map((plan: any) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {plan.provider && <p>Provider: {plan.provider}</p>}
                  {plan.coverage_type && (
                    <Badge variant="outline" className="mt-2 capitalize">
                      {plan.coverage_type}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {isHrView ? "Enrollments" : "My Enrollments"}
        </h2>
        {enrollmentList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments found</p>
        ) : (
          <div className="space-y-2">
            {enrollmentList.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between py-3 text-sm">
                  <span>{e.plan?.name ?? e.benefit_plan_id}</span>
                  <Badge variant="outline" className="capitalize">
                    {e.status ?? "active"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateBenefitPlanModal
        open={createPlanOpen}
        onOpenChange={setCreatePlanOpen}
        onCreated={refreshAll}
      />
      <EnrollBenefitModal
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        plans={planList.map((p: any) => ({ id: p.id, name: p.name }))}
        onEnrolled={refreshAll}
      />
    </div>
  );
}
