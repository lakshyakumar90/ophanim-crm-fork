import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { REVIEW_STATUSES, REVIEW_CYCLE_STATUSES, PEER_FEEDBACK_DIMENSIONS } from "../config/constants.js";
import { getStartOfTodayIST, nowIST } from "../utils/date-utils.js";

const PEER_DIMENSION_COUNT = Object.keys(PEER_FEEDBACK_DIMENSIONS).length;

function hasPeerSubmissionAccess(permissions: string[] = []): boolean {
  return (
    permissions.includes("crm:admin") ||
    permissions.includes("performance:manage") ||
    permissions.includes("performance:view") ||
    permissions.includes("hr:view") ||
    permissions.includes("hr:manage")
  );
}

// ============================================================
// REVIEW CYCLES
// ============================================================

export async function getReviewCycles(status?: string) {
  let query = supabaseAdmin
    .from("review_cycles")
    .select("*, created_by_user:users!created_by(id, full_name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

/** Managers with only performance:review see cycles where they have direct reports in the cycle. */
export async function getReviewCyclesForRequester(
  userId: string,
  permissions: string[],
  status?: string,
) {
  const all = await getReviewCycles(status);
  const fullAccess =
    permissions.includes("crm:admin") ||
    permissions.includes("performance:manage") ||
    permissions.includes("performance:view");
  if (fullAccess) return all;

  const { data: mine, error } = await supabaseAdmin
    .from("performance_reviews")
    .select("cycle_id")
    .eq("manager_id", userId);
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  const ids = new Set((mine || []).map((m: { cycle_id: string }) => m.cycle_id));
  return all.filter((c: { id: string }) => ids.has(c.id));
}

export async function getReviewCycleById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("review_cycles")
    .select("*, created_by_user:users!created_by(id, full_name)")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Review cycle");
  return data;
}

export async function createReviewCycle(input: Record<string, unknown>, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("review_cycles")
    .insert({ ...input, created_by: userId, status: REVIEW_CYCLE_STATUSES.DRAFT })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  // Notify relevant employees when cycle becomes active
  return data;
}

export async function updateReviewCycle(id: string, input: Record<string, unknown>, updaterUserId: string) {
  const existing = await getReviewCycleById(id);
  const nextStatus = (input as any).status as string | undefined;

  // Active -> Draft "deactivation" is allowed only if no review progressed beyond draft.
  if (
    nextStatus === REVIEW_CYCLE_STATUSES.DRAFT &&
    (existing as any).status === REVIEW_CYCLE_STATUSES.ACTIVE
  ) {
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from("performance_reviews")
      .select("status")
      .eq("cycle_id", id);
    if (rowsErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, rowsErr.message);

    const hasProgress =
      (rows || []).some(
        (r: { status?: string | null }) =>
          r.status != null && r.status !== REVIEW_STATUSES.DRAFT,
      );
    if (hasProgress) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Cannot move cycle back to draft after submissions have started",
      );
    }

    // Reset generated review rows so re-activation can regenerate cleanly.
    const { error: delErr } = await supabaseAdmin
      .from("performance_reviews")
      .delete()
      .eq("cycle_id", id);
    if (delErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, delErr.message);
  }

  // When activating a cycle, auto-create performance_reviews for all relevant employees
  if (nextStatus === REVIEW_CYCLE_STATUSES.ACTIVE) {
    await activateCycle(id, updaterUserId);
  }

  const { data, error } = await supabaseAdmin
    .from("review_cycles")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

/**
 * Delete a review cycle.
 * Safety rule: only draft cycles can be deleted.
 */
export async function deleteReviewCycle(id: string) {
  const cycle = await getReviewCycleById(id);

  if ((cycle as any).status !== REVIEW_CYCLE_STATUSES.DRAFT) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only draft review cycles can be deleted",
    );
  }

  // Defensive cleanup in case draft rows were pre-created.
  const { error: reviewsErr } = await supabaseAdmin
    .from("performance_reviews")
    .delete()
    .eq("cycle_id", id);
  if (reviewsErr) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, reviewsErr.message);
  }

  const { error } = await supabaseAdmin
    .from("review_cycles")
    .delete()
    .eq("id", id);

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
}

async function activateCycle(cycleId: string, activatorUserId: string) {
  const cycle = await getReviewCycleById(cycleId);

  // Get active users in scope from users table (source of truth).
  let usersQuery = supabaseAdmin
    .from("users")
    .select("id")
    .eq("is_active", true)
    .neq("role", "admin");

  if ((cycle as any).scope === "department" && (cycle as any).department_id) {
    usersQuery = usersQuery.eq("department_id", (cycle as any).department_id);
  }

  const { data: usersInScope, error: usersErr } = await usersQuery;
  if (usersErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, usersErr.message);
  if (!usersInScope || usersInScope.length === 0) return;

  const userIds = usersInScope.map((u: { id: string }) => u.id);

  // Attach reporting manager when available from employee_profiles.
  const { data: profiles, error: profilesErr } = await supabaseAdmin
    .from("employee_profiles")
    .select("user_id, reporting_manager_id")
    .in("user_id", userIds);
  if (profilesErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, profilesErr.message);

  const managerByUser = new Map<string, string | null>();
  for (const p of profiles || []) {
    managerByUser.set(
      (p as { user_id: string }).user_id,
      (p as { reporting_manager_id: string | null }).reporting_manager_id || null,
    );
  }

  // Create performance_review rows for each employee
  const reviewInserts = userIds.map((uid) => ({
    cycle_id: cycleId,
    employee_id: uid,
    manager_id: managerByUser.get(uid) || null,
    status: REVIEW_STATUSES.DRAFT,
    goals: [],
    pip_triggered: false,
  }));

  await supabaseAdmin.from("performance_reviews").upsert(reviewInserts, { onConflict: "cycle_id,employee_id", ignoreDuplicates: true });

  // Notify employees that cycle opened
  const notifications = userIds.map((uid) => ({
    user_id: uid,
    title: "Performance review cycle started 📋",
    message: `The '${(cycle as any).name}' review cycle has started. Please complete your self-assessment.`,
    type: "system",
    priority: "high",
  }));

  await supabaseAdmin.from("notifications").insert(notifications);
}

// ============================================================
// REVIEWS — Fix #6: getReviewsByCycleId used by calibration & release
// ============================================================

export async function getReviewsForEmployee(employeeId: string) {
  const { data, error } = await supabaseAdmin
    .from("performance_reviews")
    .select(
      "*, cycle:review_cycles!cycle_id(id, name, status, self_assessment_deadline, manager_review_deadline, calibration_deadline, results_release_date), employee:users!employee_id(id, full_name, email, avatar_url), manager:users!manager_id(id, full_name)",
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

/** Colleagues in the same active review cycles (for peer feedback); each row is their performance_reviews.id */
export async function getPeerFeedbackTargetsForUser(userId: string) {
  const { data: mine, error: e1 } = await supabaseAdmin
    .from("performance_reviews")
    .select("cycle_id")
    .eq("employee_id", userId);
  if (e1) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, e1.message);
  if (!mine?.length) return [];

  const cycleIds = [...new Set(mine.map((m: { cycle_id: string }) => m.cycle_id))];
  const { data: cycles, error: e2 } = await supabaseAdmin
    .from("review_cycles")
    .select("id, status, name, self_assessment_deadline")
    .in("id", cycleIds)
    .eq("status", REVIEW_CYCLE_STATUSES.ACTIVE);
  if (e2) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, e2.message);
  const activeCycleIds = (cycles || []).map((c: { id: string }) => c.id);
  if (activeCycleIds.length === 0) return [];

  // Restrict peer targets to colleagues in the same team(s) first.
  // Support multi-team users via user_teams; fallback to primary users.team_id.
  const { data: myMemberships, error: mErr } = await supabaseAdmin
    .from("user_teams")
    .select("team_id")
    .eq("user_id", userId);
  if (mErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, mErr.message);

  let myTeamIds = (myMemberships || [])
    .map((r: { team_id: string | null }) => r.team_id)
    .filter((v): v is string => Boolean(v));

  if (myTeamIds.length === 0) {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("team_id, department_id")
      .eq("id", userId)
      .maybeSingle();
    if (meErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, meErr.message);
    if (me?.team_id) myTeamIds = [me.team_id];
  }

  const teammateIds = new Set<string>();
  if (myTeamIds.length > 0) {
    const { data: teammateMemberships, error: tmErr } = await supabaseAdmin
      .from("user_teams")
      .select("user_id, team_id")
      .in("team_id", myTeamIds);
    if (tmErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, tmErr.message);
    for (const row of teammateMemberships || []) {
      const uid = (row as { user_id: string | null }).user_id;
      if (uid && uid !== userId) teammateIds.add(uid);
    }
  }

  // Department fallback for orgs still using primary department assignment.
  const { data: meDept, error: meDeptErr } = await supabaseAdmin
    .from("users")
    .select("department_id")
    .eq("id", userId)
    .maybeSingle();
  if (meDeptErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, meDeptErr.message);

  if (meDept?.department_id) {
    const { data: deptPeers, error: dpErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("department_id", meDept.department_id)
      .neq("id", userId)
      .eq("is_active", true);
    if (dpErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, dpErr.message);
    for (const row of deptPeers || []) {
      const id = (row as { id?: string }).id;
      if (id) teammateIds.add(id);
    }
  }

  const allowedEmployeeIds = [...teammateIds];
  if (allowedEmployeeIds.length === 0) return [];

  const { data: peers, error: e3 } = await supabaseAdmin
    .from("performance_reviews")
    .select(
      "id, cycle_id, status, employee:users!employee_id(id, full_name, avatar_url, job_title)",
    )
    .in("cycle_id", activeCycleIds)
    .in("employee_id", allowedEmployeeIds)
    .neq("employee_id", userId)
    .neq("status", REVIEW_STATUSES.RELEASED);

  if (e3) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, e3.message);
  return peers || [];
}

export async function getPerformanceReminderCountsForUser(userId: string) {
  const now = nowIST();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  const { data: myRows, error: myErr } = await supabaseAdmin
    .from("performance_reviews")
    .select("id, status, cycle:review_cycles!cycle_id(status, self_assessment_deadline)")
    .eq("employee_id", userId);
  if (myErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, myErr.message);

  const myReview = (myRows || []).filter((row: any) => {
    if (row.status !== REVIEW_STATUSES.DRAFT) return false;
    if (row.cycle?.status !== REVIEW_CYCLE_STATUSES.ACTIVE) return false;
    const deadline = row.cycle?.self_assessment_deadline;
    if (!deadline) return true;
    const d = new Date(deadline);
    return d.getTime() - now.getTime() <= threeDaysMs;
  }).length;

  const targets = await getPeerFeedbackTargetsForUser(userId);
  const targetIds = targets.map((t: any) => t.id);

  let peerFeedback = 0;
  if (targetIds.length > 0) {
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("peer_feedback_submissions")
      .select("review_id, dimension")
      .eq("submitter_id", userId)
      .in("review_id", targetIds);
    if (subsErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, subsErr.message);

    const dimsByReview = new Map<string, Set<string>>();
    for (const s of subs || []) {
      const rid = (s as { review_id: string }).review_id;
      const dim = (s as { dimension: string }).dimension;
      if (!dimsByReview.has(rid)) dimsByReview.set(rid, new Set());
      dimsByReview.get(rid)!.add(dim);
    }

    peerFeedback = targetIds.filter((rid) => {
      const count = dimsByReview.get(rid)?.size || 0;
      return count < PEER_DIMENSION_COUNT;
    }).length;
  }

  return {
    myReview,
    peerFeedback,
    total: myReview + peerFeedback,
  };
}

export async function getReviewsByCycleId(cycleId: string) {
  const { data, error } = await supabaseAdmin
    .from("performance_reviews")
    .select(
      "*, employee:users!employee_id(id, full_name, email, avatar_url), manager:users!manager_id(id, full_name)",
    )
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

/** HR / view-all roles see every row; managers with only performance:review see direct reports. */
export async function getReviewsByCycleIdForRequester(
  cycleId: string,
  userId: string,
  permissions: string[],
) {
  const rows = await getReviewsByCycleId(cycleId);
  const fullAccess =
    permissions.includes("crm:admin") ||
    permissions.includes("performance:manage") ||
    permissions.includes("performance:view");
  if (fullAccess) return rows;
  return rows.filter((r: { manager_id?: string | null }) => r.manager_id === userId);
}

export async function getReviewById(
  id: string,
  requestingUserId: string,
  options?: { hrOverride?: boolean; permissions?: string[] },
) {
  const { data, error } = await supabaseAdmin
    .from("performance_reviews")
    .select(
      "*, employee:users!employee_id(id, full_name, email, avatar_url), manager:users!manager_id(id, full_name)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Performance review");

  // Access check: only own review, manager, or HR
  const review = data as any;
  const isOwn = review.employee_id === requestingUserId;
  const isManager = review.manager_id === requestingUserId;
  if (!isOwn && !isManager && !options?.hrOverride) {
    // Let the route's permission middleware handle HR access
    throw new ApiError(ERROR_CODES.FORBIDDEN, "Access denied to this performance review");
  }

  // If status is not released, hide calibrated_rating from employee view
  if (review.status !== REVIEW_STATUSES.RELEASED && isOwn && !isManager) {
    review.calibrated_rating = null;
  }

  // Confidentiality: non-HR/non-admin viewers get only aggregated peer data fields.
  const privileged = Boolean(options?.hrOverride) || hasPeerSubmissionAccess(options?.permissions || []);
  if (Array.isArray(review.peer_feedback) && !privileged) {
    review.peer_feedback = review.peer_feedback.map((row: any) => ({
      dimension: row.dimension,
      aggregated_score: row.aggregated_score,
      response_count: row.response_count,
    }));
  }

  return review;
}

export async function getPeerFeedbackSubmissionsForReview(
  reviewId: string,
  requesterPermissions: string[] = [],
) {
  if (!hasPeerSubmissionAccess(requesterPermissions)) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "You are not allowed to view peer submission identities");
  }

  const { data: review, error: reviewErr } = await supabaseAdmin
    .from("performance_reviews")
    .select("id")
    .eq("id", reviewId)
    .single();

  if (reviewErr || !review) {
    throw ApiError.notFound("Performance review");
  }

  const { data, error } = await supabaseAdmin
    .from("peer_feedback_submissions")
    .select("id, dimension, score, comment, created_at, submitter:users!submitter_id(id, full_name, email)")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return data || [];
}

// ============================================================
// GOALS
// ============================================================

export async function setGoals(
  reviewId: string,
  goals: Array<{ title: string; kpi?: string; target?: string; weight?: number }>,
  managerId: string,
  options?: { overrideAccess?: boolean },
) {
  const { data: review, error } = await supabaseAdmin
    .from("performance_reviews")
    .select("manager_id, status")
    .eq("id", reviewId)
    .single();

  if (error || !review) throw ApiError.notFound("Performance review");

  if ((review as any).manager_id !== managerId && !options?.overrideAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "Only the assigned manager can set goals");
  }

  if ((review as any).status !== REVIEW_STATUSES.DRAFT) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Goals can only be set when status is draft");
  }

  const safeGoals = (goals || []).map((g) => ({ ...g }));
  const hasWeight = safeGoals.some((g) => typeof g.weight === "number");
  if (!hasWeight && safeGoals.length > 0) {
    const even = Math.floor(100 / safeGoals.length);
    let remaining = 100;
    safeGoals.forEach((g, idx) => {
      const w = idx === safeGoals.length - 1 ? remaining : even;
      g.weight = w;
      remaining -= w;
    });
  }
  const weightTotal = safeGoals.reduce((sum, g) => sum + Number(g.weight || 0), 0);
  if (safeGoals.length > 0 && weightTotal !== 100) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Goal weightage must total 100",
    );
  }

  const { data, error: updErr } = await supabaseAdmin
    .from("performance_reviews")
    .update({ goals: safeGoals as any, updated_at: new Date().toISOString() })
    .eq("id", reviewId)
    .select()
    .single();

  if (updErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, updErr.message);
  return data;
}

// ============================================================
// SELF ASSESSMENT
// ============================================================

export async function submitSelfAssessment(
  reviewId: string,
  input: Record<string, unknown>,
  employeeId: string,
) {
  const { data: review, error } = await supabaseAdmin
    .from("performance_reviews")
    .select("employee_id, status")
    .eq("id", reviewId)
    .single();

  if (error || !review) throw ApiError.notFound("Performance review");

  if ((review as any).employee_id !== employeeId) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "You can only submit your own self-assessment");
  }

  if (
    (review as any).status !== REVIEW_STATUSES.DRAFT &&
    (review as any).status !== REVIEW_STATUSES.SELF_SUBMITTED
  ) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Self-assessment cannot be modified at this stage");
  }

  const selfAssessment = { ...input, submitted_at: new Date().toISOString() };

  const { data, error: updErr } = await supabaseAdmin
    .from("performance_reviews")
    .update({
      self_assessment: selfAssessment,
      status: REVIEW_STATUSES.SELF_SUBMITTED,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select()
    .single();

  if (updErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, updErr.message);
  return data;
}

// ============================================================
// MANAGER REVIEW
// ============================================================

export async function submitManagerReview(
  reviewId: string,
  input: Record<string, unknown>,
  managerId: string,
  options?: { overrideAccess?: boolean },
) {
  const { data: review, error } = await supabaseAdmin
    .from("performance_reviews")
    .select("manager_id, status")
    .eq("id", reviewId)
    .single();

  if (error || !review) throw ApiError.notFound("Performance review");

  if ((review as any).manager_id !== managerId && !options?.overrideAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "Only the assigned manager can submit a review");
  }

  if ((review as any).status !== REVIEW_STATUSES.SELF_SUBMITTED) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Manager review requires employee to submit self-assessment first",
    );
  }

  const fullReviewRes = await supabaseAdmin
    .from("performance_reviews")
    .select("goals")
    .eq("id", reviewId)
    .single();
  const reviewGoals = ((fullReviewRes.data as any)?.goals || []) as Array<{
    title?: string;
    weight?: number;
  }>;
  const goalScores = Array.isArray((input as any).goal_scores)
    ? ((input as any).goal_scores as Array<{ title: string; score: number }>)
    : [];
  const goalManagerRatings = Array.isArray((input as any).goal_manager_ratings)
    ? ((input as any).goal_manager_ratings as Array<{ goal_index: number; manager_rating: number }>)
    : [];
  if (reviewGoals.length > 0) {
    if (goalScores.length > 0) {
      const weighted = reviewGoals.reduce((sum, g) => {
        const score = goalScores.find((s) => s.title === g.title)?.score ?? 0;
        const weight = Number(g.weight || 0);
        return sum + (score * weight) / 100;
      }, 0);
      (input as any).weighted_score = Math.round(weighted * 100) / 100;
    } else if (goalManagerRatings.length > 0) {
      const weighted = reviewGoals.reduce((sum, g, idx) => {
        const row = goalManagerRatings.find((r) => r.goal_index === idx);
        const score = row?.manager_rating ?? 0;
        const weight = Number(g.weight || 0);
        return sum + (score * weight) / 100;
      }, 0);
      (input as any).weighted_score = Math.round(weighted * 100) / 100;
    }
  }

  const managerReview = { ...input, submitted_at: new Date().toISOString() };

  const { data, error: updErr } = await supabaseAdmin
    .from("performance_reviews")
    .update({
      manager_review: managerReview,
      status: REVIEW_STATUSES.MANAGER_SUBMITTED,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select()
    .single();

  if (updErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, updErr.message);
  return data;
}

// ============================================================
// PEER FEEDBACK — Fix #4: Raw submissions stored separately, only aggregated result on review
// ============================================================

export async function submitPeerFeedback(
  reviewId: string,
  input: { dimension: string; score: number; comment?: string },
  submitterId: string,
) {
  const { data: review, error } = await supabaseAdmin
    .from("performance_reviews")
    .select("id, status")
    .eq("id", reviewId)
    .single();

  if (error || !review) throw ApiError.notFound("Performance review");

  if ((review as any).status === REVIEW_STATUSES.RELEASED) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Peer feedback cannot be submitted after results are released");
  }

  // 1. Write raw submission (anonymous — only HR Director can query this table directly via RLS)
  await supabaseAdmin.from("peer_feedback_submissions").upsert(
    {
      review_id: reviewId,
      submitter_id: submitterId,
      dimension: input.dimension,
      score: input.score,
      comment: input.comment || null,
    },
    { onConflict: "review_id,submitter_id,dimension" },
  );

  // 2. Aggregate all submissions for this review SERVER-SIDE
  const { data: allSubmissions } = await supabaseAdmin
    .from("peer_feedback_submissions")
    .select("dimension, score")
    .eq("review_id", reviewId);

  // Group by dimension and compute averages
  const dimensionGroups = (allSubmissions || []).reduce(
    (acc: Record<string, number[]>, sub: any) => {
      const dim = sub.dimension;
      if (!acc[dim]) {
        acc[dim] = [];
      }
      acc[dim]!.push(sub.score);
      return acc;
    },
    {},
  );

  const aggregated = Object.entries(dimensionGroups).map(([dimension, scores]) => ({
    dimension,
    aggregated_score: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
    response_count: scores.length,
  }));

  // 3. Write ONLY the aggregated result back to performance_reviews (no individual submitter info)
  await supabaseAdmin
    .from("performance_reviews")
    .update({ peer_feedback: aggregated as any, updated_at: new Date().toISOString() })
    .eq("id", reviewId);

  return { success: true, message: "Peer feedback submitted" };
}

// ============================================================
// CALIBRATION — Fix #6: uses getReviewsByCycleId
// ============================================================

export async function runCalibration(
  cycleId: string,
  adjustments: Array<{
    review_id: string;
    calibrated_rating: string;
    pip_triggered?: boolean;
  }>,
) {
  await getReviewCycleById(cycleId); // 404 guard

  // Apply each calibration adjustment
  const updates = await Promise.all(
    adjustments.map(async (adj) => {
      const { data, error } = await supabaseAdmin
        .from("performance_reviews")
        .update({
          calibrated_rating: adj.calibrated_rating,
          pip_triggered: adj.pip_triggered ?? false,
          status: REVIEW_STATUSES.CALIBRATED,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adj.review_id)
        .eq("cycle_id", cycleId) // Ensure review belongs to this cycle
        .select()
        .single();

      if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
      return data;
    }),
  );

  return updates;
}

// ============================================================
// DIRECTOR APPROVAL + RELEASE
// ============================================================

export async function approveCycleResults(
  cycleId: string,
  approverId: string,
  note?: string,
) {
  const reviews = await getReviewsByCycleId(cycleId);

  const calibratedReviews = reviews.filter(
    (r: any) => r.status === REVIEW_STATUSES.CALIBRATED,
  );

  if (calibratedReviews.length === 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "No calibrated reviews found to approve",
    );
  }

  const { error: approveErr } = await supabaseAdmin
    .from("performance_reviews")
    .update({
      status: REVIEW_STATUSES.DIRECTOR_APPROVED,
      updated_at: new Date().toISOString(),
    })
    .eq("cycle_id", cycleId)
    .eq("status", REVIEW_STATUSES.CALIBRATED);

  if (approveErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, approveErr.message);

  await supabaseAdmin
    .from("review_cycles")
    .update({
      final_approved_by: approverId,
      final_approved_at: new Date().toISOString(),
      final_approval_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cycleId);

  return { approved: calibratedReviews.length };
}

export async function releaseResults(cycleId: string) {
  const cycle = await getReviewCycleById(cycleId);
  if (!(cycle as any).final_approved_at) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Cycle must be approved before release",
    );
  }

  const reviews = await getReviewsByCycleId(cycleId);

  const approvedReviews = reviews.filter(
    (r: any) => r.status === REVIEW_STATUSES.DIRECTOR_APPROVED,
  );

  if (approvedReviews.length === 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "No director-approved reviews found to release",
    );
  }

  // Mark all approved reviews as released
  const { error: releaseErr } = await supabaseAdmin
    .from("performance_reviews")
    .update({ status: REVIEW_STATUSES.RELEASED, updated_at: new Date().toISOString() })
    .eq("cycle_id", cycleId)
    .eq("status", REVIEW_STATUSES.DIRECTOR_APPROVED);

  if (releaseErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, releaseErr.message);

  // Mark cycle as completed
  await supabaseAdmin
    .from("review_cycles")
    .update({ status: REVIEW_CYCLE_STATUSES.COMPLETED, updated_at: new Date().toISOString() })
    .eq("id", cycleId);

  // Notify employees that results are available
  const notifications = approvedReviews.map((r: any) => ({
    user_id: r.employee_id,
    title: "Performance review results available 📊",
    message: "Your performance review results have been published. Check your review dashboard.",
    type: "system",
    priority: "high",
  }));

  if (notifications.length > 0) {
    await supabaseAdmin.from("notifications").insert(notifications);
  }

  return { released: approvedReviews.length };
}

async function maybeInsertDeadlineNotification(params: {
  userId: string;
  relatedType: string;
  relatedId: string;
  title: string;
  message: string;
  actionUrl: string;
  priority: "high" | "medium" | "low";
  startOfTodayIso: string;
}) {
  const { data: already } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", params.userId)
    .eq("related_entity_type", params.relatedType)
    .eq("related_entity_id", params.relatedId)
    .gte("created_at", params.startOfTodayIso)
    .limit(1);

  if ((already || []).length > 0) return;

  await supabaseAdmin.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: "reminder",
    related_entity_type: params.relatedType,
    related_entity_id: params.relatedId,
    action_url: params.actionUrl,
    priority: params.priority,
  });
}

/**
 * Called from cron/reminders. Sends due-soon and overdue reminders for active performance cycles.
 */
export async function processPerformanceDeadlineReminders() {
  const now = nowIST();
  const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startOfTodayIso = getStartOfTodayIST();

  const { data: cycles, error: cycleErr } = await supabaseAdmin
    .from("review_cycles")
    .select("id, name, status, mid_checkin_date, self_assessment_deadline, manager_review_deadline")
    .eq("status", REVIEW_CYCLE_STATUSES.ACTIVE);

  if (cycleErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, cycleErr.message);

  for (const cycle of cycles || []) {
    const c = cycle as any;

    const selfDeadline = c.self_assessment_deadline ? new Date(c.self_assessment_deadline) : null;
    if (selfDeadline) {
      const { data: rows, error: rowsErr } = await supabaseAdmin
        .from("performance_reviews")
        .select("id, employee_id, status")
        .eq("cycle_id", c.id)
        .eq("status", REVIEW_STATUSES.DRAFT);
      if (rowsErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, rowsErr.message);

      for (const row of rows || []) {
        const r = row as any;
        const overdue = selfDeadline.getTime() <= now.getTime();
        const dueSoon = selfDeadline.getTime() > now.getTime() && selfDeadline.getTime() <= dayAhead.getTime();
        if (!overdue && !dueSoon) continue;

        const state = overdue ? "overdue" : "soon";
        await maybeInsertDeadlineNotification({
          userId: r.employee_id,
          relatedType: "performance_self_deadline",
          relatedId: `${r.id}:${state}`,
          title: overdue ? "Self-assessment overdue" : "Self-assessment due soon",
          message: overdue
            ? `Your self-assessment for '${c.name}' is overdue. Please submit it as soon as possible.`
            : `Your self-assessment for '${c.name}' is due within 24 hours.`,
          actionUrl: "/performance/my-review",
          priority: overdue ? "high" : "medium",
          startOfTodayIso,
        });
      }
    }

    const managerDeadline = c.manager_review_deadline ? new Date(c.manager_review_deadline) : null;
    if (managerDeadline) {
      const { data: rows, error: rowsErr } = await supabaseAdmin
        .from("performance_reviews")
        .select("id, manager_id, status")
        .eq("cycle_id", c.id)
        .eq("status", REVIEW_STATUSES.SELF_SUBMITTED)
        .not("manager_id", "is", null);
      if (rowsErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, rowsErr.message);

      for (const row of rows || []) {
        const r = row as any;
        const overdue = managerDeadline.getTime() <= now.getTime();
        const dueSoon = managerDeadline.getTime() > now.getTime() && managerDeadline.getTime() <= dayAhead.getTime();
        if (!overdue && !dueSoon) continue;

        const state = overdue ? "overdue" : "soon";
        await maybeInsertDeadlineNotification({
          userId: r.manager_id,
          relatedType: "performance_manager_deadline",
          relatedId: `${r.id}:${state}`,
          title: overdue ? "Manager review overdue" : "Manager review due soon",
          message: overdue
            ? `A manager review in '${c.name}' is overdue.`
            : `A manager review in '${c.name}' is due within 24 hours.`,
          actionUrl: `/hr/performance/${c.id}`,
          priority: overdue ? "high" : "medium",
          startOfTodayIso,
        });
      }
    }

    const peerCheckpoint = c.mid_checkin_date ? new Date(c.mid_checkin_date) : null;
    if (peerCheckpoint) {
      const overdue = peerCheckpoint.getTime() <= now.getTime();
      const dueSoon = peerCheckpoint.getTime() > now.getTime() && peerCheckpoint.getTime() <= dayAhead.getTime();
      if (!overdue && !dueSoon) continue;

      const { data: rows, error: rowsErr } = await supabaseAdmin
        .from("performance_reviews")
        .select("employee_id")
        .eq("cycle_id", c.id);
      if (rowsErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, rowsErr.message);

      const participantIds = [...new Set((rows || []).map((r: any) => r.employee_id).filter(Boolean))];
      const state = overdue ? "overdue" : "soon";

      for (const uid of participantIds) {
        await maybeInsertDeadlineNotification({
          userId: uid,
          relatedType: "performance_peer_deadline",
          relatedId: `${c.id}:${uid}:${state}`,
          title: overdue ? "Peer feedback checkpoint passed" : "Peer feedback checkpoint due soon",
          message: overdue
            ? `The peer feedback checkpoint for '${c.name}' has passed. Please complete remaining peer feedback.`
            : `Peer feedback checkpoint for '${c.name}' is within 24 hours.`,
          actionUrl: "/performance/peer-feedback",
          priority: overdue ? "high" : "medium",
          startOfTodayIso,
        });
      }
    }
  }

  return { success: true };
}

export async function acknowledgeReview(
  reviewId: string,
  employeeId: string,
  note?: string,
) {
  const { data: review, error } = await supabaseAdmin
    .from("performance_reviews")
    .select("id, employee_id, status, acknowledged_at")
    .eq("id", reviewId)
    .single();

  if (error || !review) throw ApiError.notFound("Performance review");

  if ((review as any).employee_id !== employeeId) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "You can only acknowledge your own review");
  }

  if ((review as any).status !== REVIEW_STATUSES.RELEASED) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only released reviews can be acknowledged",
    );
  }

  if ((review as any).acknowledged_at) {
    return { acknowledged: true, alreadyAcknowledged: true };
  }

  const { error: updErr } = await supabaseAdmin
    .from("performance_reviews")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledgement_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("employee_id", employeeId);

  if (updErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, updErr.message);

  return { acknowledged: true, alreadyAcknowledged: false };
}

// ============================================================
// ANALYTICS
// ============================================================

export async function getPerformanceAnalytics(cycleId?: string) {
  let query = supabaseAdmin
    .from("performance_reviews")
    .select("calibrated_rating, status, pip_triggered, cycle_id");

  if (cycleId) query = query.eq("cycle_id", cycleId);

  const { data: reviews } = await query;
  const all = reviews || [];

  const ratingDistribution = all
    .filter((r: any) => r.calibrated_rating)
    .reduce((acc: Record<string, number>, r: any) => {
      acc[r.calibrated_rating] = (acc[r.calibrated_rating] || 0) + 1;
      return acc;
    }, {});

  const statusDistribution = all.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const pipCount = all.filter((r: any) => r.pip_triggered).length;
  const highPerformers = (ratingDistribution["exceptional"] || 0) + (ratingDistribution["exceeds"] || 0);

  return {
    totalReviews: all.length,
    ratingDistribution,
    statusDistribution,
    pipTriggered: pipCount,
    highPerformers,
    completionRate: all.length > 0
      ? Math.round(
          (
            all.filter((r: any) => ["director_approved", "released"].includes(r.status))
              .length /
            all.length
          ) * 100,
        )
      : 0,
  };
}
