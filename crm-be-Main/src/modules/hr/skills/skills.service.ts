import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";

export async function listSkills(query: { category?: string; search?: string }) {
  let dbQuery = supabaseAdmin.from("skills").select("*").order("name");

  if (query.category) dbQuery = dbQuery.eq("category", query.category);
  if (query.search) {
    dbQuery = dbQuery.or(`name.ilike.%${query.search}%,category.ilike.%${query.search}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function getSkillById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("skills")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Skill");
  return data;
}

export async function createSkill(input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("skills")
    .insert(input)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function updateSkill(id: string, input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("skills")
    .update({ ...input, updated_at: getCurrentTimestamp() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Skill");
  return data;
}

export async function deleteSkill(id: string) {
  const { error } = await supabaseAdmin.from("skills").delete().eq("id", id);
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
}

export async function getEmployeeSkills(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("employee_skills")
    .select("*, skill:skills(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function upsertEmployeeSkill(
  userId: string,
  input: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("employee_skills")
    .upsert(
      { user_id: userId, ...input },
      { onConflict: "user_id,skill_id" },
    )
    .select("*, skill:skills(*)")
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function updateEmployeeSkill(
  userId: string,
  skillId: string,
  input: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("employee_skills")
    .update({ ...input, updated_at: getCurrentTimestamp() })
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .select("*, skill:skills(*)")
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Employee skill");
  return data;
}

export async function deleteEmployeeSkill(userId: string, skillId: string) {
  const { error } = await supabaseAdmin
    .from("employee_skills")
    .delete()
    .eq("user_id", userId)
    .eq("skill_id", skillId);

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
}

export async function getSkillsMatrix(query: { category?: string }) {
  let skillsQuery = supabaseAdmin.from("skills").select("*").order("category").order("name");
  if (query.category) skillsQuery = skillsQuery.eq("category", query.category);

  const { data: skills, error: skillsError } = await skillsQuery;
  if (skillsError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, skillsError.message);

  const { data: employeeSkills, error: esError } = await supabaseAdmin
    .from("employee_skills")
    .select(
      "*, skill:skills(id, name, category), employee:users!user_id(id, full_name, email, job_title, team_id)",
    );

  if (esError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, esError.message);

  return {
    skills: skills || [],
    employee_skills: employeeSkills || [],
  };
}
