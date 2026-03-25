import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";

/**
 * Gather full holistic analytics on HR systems
 */
export async function getComprehensiveAnalytics() {
  const [
    { count: headcount },
    { data: leaves },
    { data: activePostings },
    { data: payrolls },
    { data: reviewCycles },
    { data: probationList },
    { data: expiringDocs }
  ] = await Promise.all([
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("leave_requests").select("status").gte("start_date", new Date(new Date().getFullYear(), 0, 1).toISOString()),
    supabaseAdmin.from("job_postings").select("id, positions_open").eq("status", "open"),
    supabaseAdmin.from("payroll_runs").select("total_gross, month").order("month", { ascending: false }).limit(6),
    supabaseAdmin.from("review_cycles").select("status").in("status", ["active", "draft"]),
    supabaseAdmin.from("employee_profiles").select("user_id").eq("hr_status", "probation"),
    supabaseAdmin.from("employee_documents").select("id").not("expiry_date", "is", null).lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const leaveRate = (leaves || []).filter(l => l.status === "approved").length;
  const totalOpenings = (activePostings || []).reduce((sum, p) => sum + (p.positions_open || 1), 0);

  return {
    headcount: headcount || 0,
    activePostings: totalOpenings,
    ytdLeaves: leaveRate,
    payrollTrend: payrolls || [],
    activeReviewCycles: (reviewCycles || []).length,
    employeesOnProbation: (probationList || []).length,
    expiringDocuments: (expiringDocs || []).length,
  };
}

/**
 * Background checks to run periodically for compliance
 * E.g document expiry, probation ending
 */
export async function runComplianceChecks() {
  let notificationsSent = 0;
  
  // 1. Check expiring documents (within 30 days)
  const targetDateDocs = new Date();
  targetDateDocs.setDate(targetDateDocs.getDate() + 30);
  const { data: docs } = await supabaseAdmin
    .from("employee_documents")
    .select("id, title, user_id, expiry_date")
    .lte("expiry_date", targetDateDocs.toISOString().split("T")[0])
    .gte("expiry_date", new Date().toISOString().split("T")[0]);

  if (docs && docs.length > 0) {
    const alerts = docs.map((doc: any) => ({
      user_id: doc.user_id,
      title: "Document Expiring Soon ⚠️",
      message: `Your document '${doc.title}' expires on ${doc.expiry_date}. Please upload a new version.`,
      type: "system",
      priority: "high"
    }));
    await supabaseAdmin.from("notifications").insert(alerts);
    notificationsSent += alerts.length;
  }

  // 2. Check probation ending (within 14 days)
  const targetDateProbation = new Date();
  targetDateProbation.setDate(targetDateProbation.getDate() + 14);
  const { data: probation } = await supabaseAdmin
    .from("employee_profiles")
    .select("user_id, reporting_manager_id, probation_end_date, hr_status, users!user_id(full_name)")
    .eq("hr_status", "probation")
    .lte("probation_end_date", targetDateProbation.toISOString().split("T")[0])
    .gte("probation_end_date", new Date().toISOString().split("T")[0]);

  if (probation && probation.length > 0) {
    const alerts = probation.flatMap((emp: any) => {
      const msgs = [
        {
          user_id: emp.user_id,
          title: "Probation Ending Soon 🔍",
          message: `Your probation period ends on ${emp.probation_end_date}. Your manager will schedule a review.`,
          type: "system",
          priority: "high"
        }
      ];
      if (emp.reporting_manager_id) {
        msgs.push({
          user_id: emp.reporting_manager_id,
          title: "Team Member Probation Ending 📋",
          message: `${emp.users?.full_name}'s probation period ends on ${emp.probation_end_date}. Please complete their review.`,
          type: "system",
          priority: "high"
        });
      }
      return msgs;
    });
    
    await supabaseAdmin.from("notifications").insert(alerts);
    notificationsSent += alerts.length;
  }

  return { success: true, notificationsSent };
}

/**
 * ============================================================
 * Independent Card Aggregators (Phase 1 – Dashboard Decomposition)
 * Each function fetches only what's needed for a single dashboard card
 * ============================================================
 */

/**
 * Headcount Analytics: Total, active, by department, by role
 */
export async function getHeadcountAnalytics() {
  const [
    { count: total },
    { data: employees },
    { data: byDept },
    { data: byRole }
  ] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseAdmin
      .from("employee_profiles")
      .select("id, department, designation, hr_status")
      .eq("hr_status", "active"),
    supabaseAdmin
      .from("employee_profiles")
      .select("department")
      .eq("hr_status", "active"),
    supabaseAdmin
      .from("employee_profiles")
      .select("designation")
      .eq("hr_status", "active"),
  ]);

  const byDeptMap = new Map<string, number>();
  (byDept || []).forEach((emp: any) => {
    const dept = emp.department || "Unassigned";
    byDeptMap.set(dept, (byDeptMap.get(dept) || 0) + 1);
  });

  const byRoleMap = new Map<string, number>();
  (byRole || []).forEach((emp: any) => {
    const role = emp.designation || "Unassigned";
    byRoleMap.set(role, (byRoleMap.get(role) || 0) + 1);
  });

  return {
    totalEmployees: total || 0,
    activeEmployees: employees?.length || 0,
    onProbation: (employees || []).filter((e: any) => e.hr_status === "probation").length,
    departmentBreakdown: Array.from(byDeptMap, ([dept, count]) => ({ department: dept, count }))
      .sort((a, b) => b.count - a.count),
    roleBreakdown: Array.from(byRoleMap, ([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Leave Analytics: Employees on leave today, leave summary
 */
export async function getLeaveAnalytics() {
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: onLeaveToday },
    { data: leaveStats },
    { data: pendingApprovals }
  ] = await Promise.all([
    supabaseAdmin
      .from("leave_requests")
      .select("id, user_id, users!user_id(full_name, email), leave_type, start_date, end_date, status")
      .gte("start_date", today)
      .lte("end_date", today)
      .eq("status", "approved"),
    supabaseAdmin
      .from("leave_requests")
      .select("status, leave_type"),
    supabaseAdmin
      .from("leave_requests")
      .select("id, user_id, users!user_id(full_name), leave_type, start_date, status")
      .eq("status", "pending")
      .order("start_date", { ascending: true })
      .limit(10),
  ]);

  const leaveTypeMap = new Map<string, number>();
  (leaveStats || []).forEach((req: any) => {
    if (req.status === "approved") {
      const type = req.leave_type || "Other";
      leaveTypeMap.set(type, (leaveTypeMap.get(type) || 0) + 1);
    }
  });

  return {
    employeesOnLeaveToday: onLeaveToday?.length || 0,
    onLeaveList: (onLeaveToday || []).map((req: any) => ({
      userId: req.user_id,
      userName: req.users?.full_name || "Unknown",
      leaveType: req.leave_type,
      startDate: req.start_date,
      endDate: req.end_date,
    })),
    leaveBreakdown: Array.from(leaveTypeMap, ([type, count]) => ({ leaveType: type, count })),
    pendingApprovals: pendingApprovals?.length || 0,
    pendingApprovalsList: (pendingApprovals || []).map((req: any) => ({
      id: req.id,
      userName: req.users?.full_name || "Unknown",
      leaveType: req.leave_type,
      startDate: req.start_date,
    })),
  };
}

/**
 * Recruitment Analytics: Open positions, pipeline stages, recent activity
 */
export async function getRecruitmentAnalytics() {
  const [
    { data: openPostings },
    { data: candidates },
    { data: recentOffers }
  ] = await Promise.all([
    supabaseAdmin
      .from("job_postings")
      .select("id, title, positions_open, status")
      .eq("status", "open"),
    supabaseAdmin
      .from("candidates")
      .select("stage"),
    supabaseAdmin
      .from("interviews")
      .select("id, candidate_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stageMap = new Map<string, number>();
  (candidates || []).forEach((c: any) => {
    const stage = c.stage || "applied";
    stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
  });

  const totalPositions = (openPostings || []).reduce((sum, p: any) => sum + (p.positions_open || 1), 0);

  return {
    openJobPostings: openPostings?.length || 0,
    totalOpenPositions: totalPositions,
    pipelineByStage: Array.from(stageMap, ([stage, count]) => ({ stage, count })),
    totalCandidatesInPipeline: candidates?.length || 0,
    recentInterviewsCount: recentOffers?.length || 0,
  };
}

/**
 * Payroll Analytics: Current month status, recent trend, pending approvals
 */
export async function getPayrollAnalytics() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [
    { data: currentRun },
    { data: recentRuns },
    { data: pendingApprovals }
  ] = await Promise.all([
    supabaseAdmin
      .from("payroll_runs")
      .select("id, status, total_gross, total_net, created_at")
      .eq("month", currentMonth)
      .order("created_at", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("payroll_runs")
      .select("month, status, total_gross, total_net")
      .order("month", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("payroll_runs")
      .select("id, month, status")
      .eq("status", "submitted")
      .order("month", { ascending: true })
      .limit(10),
  ]);

  const statusMap = new Map<string, number>();
  (recentRuns || []).forEach((run: any) => {
    statusMap.set(run.status || "unknown", (statusMap.get(run.status) || 0) + 1);
  });

  return {
    currentMonthStatus: currentRun?.[0]?.status || "not_initiated",
    currentMonthTotal: currentRun?.[0]?.total_net || 0,
    recentMonthsTrend: recentRuns || [],
    statusDistribution: Array.from(statusMap, ([status, count]) => ({ status, count })),
    pendingApprovals: pendingApprovals?.length || 0,
  };
}

/**
 * Performance Analytics: Active cycles, review status, upcoming deadlines
 */
export async function getPerformanceAnalytics() {
  const [
    { data: activeCycles },
    { data: reviews },
    { data: pendingReviews }
  ] = await Promise.all([
    supabaseAdmin
      .from("review_cycles")
      .select("id, name, status, start_date, end_date, participants_count")
      .in("status", ["draft", "active"])
      .order("end_date", { ascending: true }),
    supabaseAdmin
      .from("performance_reviews")
      .select("status"),
    supabaseAdmin
      .from("performance_reviews")
      .select("id, employee_id, users!employee_id(full_name), cycle_id, status")
      .eq("status", "self_submitted")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const reviewStats = new Map<string, number>();
  (reviews || []).forEach((r: any) => {
    reviewStats.set(r.status || "draft", (reviewStats.get(r.status) || 0) + 1);
  });

  return {
    activeReviewCycles: activeCycles?.length || 0,
    upcomingDeadlines: activeCycles || [],
    reviewStatusDistribution: Array.from(reviewStats, ([status, count]) => ({ status, count })),
    pendingManagerReviews: pendingReviews?.length || 0,
    pendingReviewsList: (pendingReviews || []).map((r: any) => ({
      id: r.id,
      employeeName: r.users?.full_name || "Unknown",
      status: r.status,
    })),
  };
}

/**
 * Compliance Analytics: Expiring documents, probation ending, certifications
 */
export async function getComplianceAnalytics() {
  const today = new Date();
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split("T")[0];
  const nextMonthStr = nextMonth.toISOString().split("T")[0];

  const [
    { data: expiringDocs },
    { data: probationEnding },
    { data: missingDocs }
  ] = await Promise.all([
    supabaseAdmin
      .from("employee_documents")
      .select("id, title, user_id, users!user_id(full_name), expiry_date, document_type")
      .not("expiry_date", "is", null)
      .gte("expiry_date", todayStr)
      .lte("expiry_date", nextMonthStr)
      .order("expiry_date", { ascending: true }),
    supabaseAdmin
      .from("employee_profiles")
      .select("user_id, users!user_id(full_name), probation_end_date, department")
      .eq("hr_status", "probation")
      .gte("probation_end_date", todayStr)
      .lte("probation_end_date", nextMonthStr)
      .order("probation_end_date", { ascending: true })
      .limit(10),
    supabaseAdmin
      .from("employee_profiles")
      .select("id, user_id, users!user_id(full_name), department")
      .eq("hr_status", "active")
      .limit(10), // Simplified for now
  ]);

  return {
    expiringDocumentsCount: expiringDocs?.length || 0,
    expiringDocumentsList: (expiringDocs || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      employeeName: doc.users?.full_name || "Unknown",
      expiryDate: doc.expiry_date,
      documentType: doc.document_type,
    })),
    probationEndingCount: probationEnding?.length || 0,
    probationEndingList: (probationEnding || []).map((emp: any) => ({
      userId: emp.user_id,
      employeeName: emp.users?.full_name || "Unknown",
      probationEndDate: emp.probation_end_date,
      department: emp.department,
    })),
    complianceScore: 85, // Simplified for now
  };
}

/**
 * Onboarding Analytics: Active onboardings, pending tasks, completion rate
 */
export async function getOnboardingAnalytics() {
  const [
    { data: activeOnboardings },
    { data: completedOnboardings },
    { data: pipelineRows },
  ] = await Promise.all([
    supabaseAdmin
      .from("onboarding_checklists")
      .select(
        "id, employee_id, joining_date, tasks, created_at, updated_at, employee:users!employee_id(id, full_name, email)",
      )
      .eq("type", "onboarding")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("onboarding_checklists")
      .select("id, tasks, created_at")
      .eq("type", "onboarding"),
    supabaseAdmin
      .from("onboarding_checklists")
      .select("id, tasks, type, created_at")
      .limit(200),
  ]);

  const computeRate = (tasks: unknown): number => {
    const arr = (tasks as { status?: string }[]) || [];
    if (!arr.length) return 0;
    const done = arr.filter((t) => t.status === "done").length;
    return Math.round((done / arr.length) * 100);
  };

  const list = activeOnboardings || [];
  const avgCompletion =
    list.length > 0
      ? Math.round(
          list.reduce((sum: number, o: any) => sum + computeRate(o.tasks), 0) /
            list.length,
        )
      : 0;

  const completedFull = (completedOnboardings || []).filter(
    (o: any) => computeRate(o.tasks) >= 100,
  );

  return {
    activeOnboardings: list.filter((o: any) => computeRate(o.tasks) < 100).length,
    activeOnboardingsList: list.slice(0, 10).map((o: any) => ({
      id: o.id,
      employeeName: o.employee?.full_name || "Unknown",
      startedDate: o.created_at,
      completionRate: computeRate(o.tasks),
    })),
    completedThisMonth: completedFull.length,
    completionRate: avgCompletion,
    onboardingVsOffboarding: {
      onboarding: (pipelineRows || []).filter((r: any) => r.type === "onboarding").length,
      offboarding: (pipelineRows || []).filter((r: any) => r.type === "offboarding").length,
    },
    recentCompletedOnboarding: completedFull.slice(-5).reverse(),
  };
}

/**
 * System Alerts: Aggregated high-priority alerts requiring action
 */
export async function getSystemAlerts() {
  const alerts: Array<{
    id: string;
    title: string;
    message: string;
    type: "error" | "warning" | "info";
    priority: "high" | "medium" | "low";
    actionUrl?: string;
    createdAt: string;
  }> = [];

  // Check for expiring documents
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: expiringDocs } = await supabaseAdmin
    .from("employee_documents")
    .select("id, title, user_id, expiry_date")
    .not("expiry_date", "is", null)
    .gte("expiry_date", today)
    .lte("expiry_date", thirtyDaysOut)
    .order("expiry_date", { ascending: true })
    .limit(3);

  if (expiringDocs && expiringDocs.length > 0) {
    alerts.push({
      id: "alert_expiring_docs",
      title: "Documents Expiring Soon 📋",
      message: `${expiringDocs.length} employee document(s) expiring in the next 30 days. Review compliance status.`,
      type: "warning",
      priority: "high",
      actionUrl: "/hr/compliance",
      createdAt: new Date().toISOString(),
    });
  }

  // Check for pending payroll approvals
  const { data: pendingPayroll } = await supabaseAdmin
    .from("payroll_runs")
    .select("id, month, status")
    .eq("status", "submitted")
    .limit(3);

  if (pendingPayroll && pendingPayroll.length > 0) {
    alerts.push({
      id: "alert_pending_payroll",
      title: "Payroll Approval Pending ⏳",
      message: `${pendingPayroll.length} payroll run(s) awaiting approval for payment processing.`,
      type: "warning",
      priority: "high",
      actionUrl: "/hr/payroll",
      createdAt: new Date().toISOString(),
    });
  }

  // Check for pending leave approvals
  const { data: pendingLeaves } = await supabaseAdmin
    .from("leave_requests")
    .select("id, user_id, users!user_id(full_name), leave_type, start_date")
    .eq("status", "pending")
    .order("start_date", { ascending: true })
    .limit(3);

  if (pendingLeaves && pendingLeaves.length > 0) {
    alerts.push({
      id: "alert_pending_leaves",
      title: "Leave Requests Awaiting Approval 🗓️",
      message: `${pendingLeaves.length} leave request(s) pending manager approval.`,
      type: "info",
      priority: "medium",
      actionUrl: "/hr/leaves",
      createdAt: new Date().toISOString(),
    });
  }

  return { alerts, count: alerts.length };
}

/**
 * Activity Feed: Recent HR activities across all modules
 */
export async function getActivityFeed(limit = 15) {
  const { data: activities } = await supabaseAdmin
    .from("activity_events")
    .select(
      "id, event_type, resource_type, resource_id, actor_id, actor:users!actor_id(full_name), created_at, metadata",
      { count: "exact" }
    )
    .in("resource_type", ["employee", "leave_request", "payroll_run", "review_cycle", "interview"])
    .order("created_at", { ascending: false })
    .limit(limit);

  const humanizedActivities = (activities || []).map((activity: any) => {
    const actor = activity.actor?.full_name || "System";
    const resource = activity.resource_type || "item";

    let description = "";
    switch (activity.event_type) {
      case "created":
        description = `${actor} created a new ${resource}`;
        break;
      case "updated":
        description = `${actor} updated ${resource}`;
        break;
      case "deleted":
        description = `${actor} deleted a ${resource}`;
        break;
      case "approved":
        description = `${actor} approved ${resource}`;
        break;
      case "rejected":
        description = `${actor} rejected ${resource}`;
        break;
      default:
        description = `${actor} performed action on ${resource}`;
    }

    return {
      id: activity.id,
      description,
      resourceType: activity.resource_type,
      resourceId: activity.resource_id,
      createdAt: activity.created_at,
      actor: actor,
    };
  });

  return { activities: humanizedActivities };
}
