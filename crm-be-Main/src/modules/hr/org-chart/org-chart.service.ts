import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

export interface OrgChartNode {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  role: string | null;
  department_name: string | null;
  team_name: string | null;
  designation: string | null;
  hr_status: string | null;
  reporting_manager_id: string | null;
  children: OrgChartNode[];
}

export async function getOrgChart() {
  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      job_title,
      avatar_url,
      role,
      is_active,
      teams:team_id (
        name,
        departments:department_id (name)
      )
    `,
    )
    .eq("is_active", true);

  if (usersError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);

  const userIds = (users || []).map((u: { id: string }) => u.id);
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("employee_profiles")
    .select("user_id, designation, hr_status, reporting_manager_id")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  if (profilesError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, profilesError.message);

  const profileMap = new Map(
    (profiles || []).map((p: {
      user_id: string;
      designation: string | null;
      hr_status: string | null;
      reporting_manager_id: string | null;
    }) => [p.user_id, p]),
  );

  const nodes = new Map<string, OrgChartNode>();

  for (const user of users || []) {
    const u = user as {
      id: string;
      full_name: string;
      email: string;
      job_title: string | null;
      avatar_url: string | null;
      role: string | null;
      teams?: { name?: string; departments?: { name?: string } } | null;
    };
    const profile = profileMap.get(u.id);

    nodes.set(u.id, {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      job_title: u.job_title,
      avatar_url: u.avatar_url,
      role: u.role,
      department_name: u.teams?.departments?.name || null,
      team_name: u.teams?.name || null,
      designation: profile?.designation || null,
      hr_status: profile?.hr_status || null,
      reporting_manager_id: profile?.reporting_manager_id || null,
      children: [],
    });
  }

  const roots: OrgChartNode[] = [];

  for (const node of nodes.values()) {
    const managerId = node.reporting_manager_id;
    if (managerId && nodes.has(managerId)) {
      nodes.get(managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: OrgChartNode[]) => {
    list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    for (const item of list) sortNodes(item.children);
  };
  sortNodes(roots);

  const admins = [...nodes.values()].filter((n) => n.role === "admin");
  const primaryAdmin =
    admins.find((a) => /ophanim/i.test(a.full_name)) ||
    admins.sort((a, b) => a.full_name.localeCompare(b.full_name))[0];

  if (primaryAdmin) {
    // Detach primary admin from their manager so they sit at the top
    for (const node of nodes.values()) {
      node.children = node.children.filter((c) => c.id !== primaryAdmin.id);
    }

    const otherRoots = roots.filter((r) => r.id !== primaryAdmin.id);
    for (const orphan of otherRoots) {
      if (!primaryAdmin.children.some((c) => c.id === orphan.id)) {
        primaryAdmin.children.push(orphan);
      }
    }
    sortNodes(primaryAdmin.children);
    return {
      roots: [primaryAdmin],
      total_employees: nodes.size,
    };
  }

  return {
    roots,
    total_employees: nodes.size,
  };
}
