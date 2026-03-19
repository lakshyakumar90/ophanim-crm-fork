import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";
import { createNotification } from "./notifications.service.js";

// ====================
// TYPES
// ====================

export interface ProjectNote {
  id: string;
  projectId: string;
  userId: string | null;
  userName?: string;
  userAvatar?: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const USER_MENTION_REGEX = /@\[(.+?)\]\(user:([0-9a-fA-F-]{36})\)/g;

function extractMentionedUserIds(content: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(USER_MENTION_REGEX.source, "g");

  while ((match = regex.exec(content)) !== null) {
    if (match[2]) {
      ids.add(match[2]);
    }
  }

  return Array.from(ids);
}

async function notifyMentionedUsers(params: {
  projectId: string;
  projectName: string;
  authorId: string;
  authorName: string;
  noteId: string;
  mentionedUserIds: string[];
}) {
  const recipients = params.mentionedUserIds.filter(
    (userId) => userId && userId !== params.authorId,
  );

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        title: "You were mentioned",
        message: `${params.authorName} mentioned you in ${params.projectName}`,
        type: "mention",
        relatedEntityType: "project_note",
        relatedEntityId: params.noteId,
        actionUrl: `/projects/${params.projectId}/discussion`,
        priority: "medium",
      }).catch(() => null),
    ),
  );
}

// ====================
// NOTE OPERATIONS
// ====================

/**
 * Get all notes for a project
 */
export async function getProjectNotes(
  projectId: string,
): Promise<ProjectNote[]> {
  const { data, error } = await supabaseAdmin
    .from("project_notes")
    .select(
      `
      *,
      user:user_id (full_name, avatar_url)
    `,
    )
    .eq("project_id", projectId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((note: any) => ({
    id: note.id,
    projectId: note.project_id,
    userId: note.user_id,
    userName: note.user?.full_name,
    userAvatar: note.user?.avatar_url,
    content: note.content,
    isPinned: note.is_pinned,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }));
}

/**
 * Get single note by ID
 */
export async function getNoteById(noteId: string): Promise<ProjectNote> {
  const { data, error } = await supabaseAdmin
    .from("project_notes")
    .select(
      `
      *,
      user:user_id (full_name, avatar_url)
    `,
    )
    .eq("id", noteId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Note");
  }

  return {
    id: data.id,
    projectId: data.project_id,
    userId: data.user_id,
    userName: (data as any).user?.full_name,
    userAvatar: (data as any).user?.avatar_url,
    content: data.content,
    isPinned: data.is_pinned,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Create a note
 */
export async function createNote(
  projectId: string,
  content: string,
  userId: string,
): Promise<ProjectNote> {
  // Verify project exists
  const { data: project, error: projError } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (projError || !project) {
    throw ApiError.notFound("Project");
  }

  const { data, error } = await supabaseAdmin
    .from("project_notes")
    .insert({
      project_id: projectId,
      user_id: userId,
      content: content,
      is_pinned: false,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const note = await getNoteById(data.id);

  const { data: author } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  await notifyMentionedUsers({
    projectId,
    projectName: (project as any).name || "a project",
    authorId: userId,
    authorName: author?.full_name || "Someone",
    noteId: note.id,
    mentionedUserIds: extractMentionedUserIds(content),
  });

  return note;
}

/**
 * Update a note
 */
export async function updateNote(
  noteId: string,
  content: string,
  userId: string,
  authUser: AuthUser,
): Promise<ProjectNote> {
  // Get existing note
  const existing = await getNoteById(noteId);
  const existingMentionedUserIds = new Set(extractMentionedUserIds(existing.content));

  // Only author or admin/manager can edit
  if (
    existing.userId !== userId &&
    authUser.role !== USER_ROLES.ADMIN &&
    authUser.role !== USER_ROLES.MANAGER
  ) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "You can only edit your own notes",
    );
  }

  const { error } = await supabaseAdmin
    .from("project_notes")
    .update({ content })
    .eq("id", noteId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const updatedNote = await getNoteById(noteId);
  const nextMentionedUserIds = extractMentionedUserIds(content).filter(
    (mentionedUserId) => !existingMentionedUserIds.has(mentionedUserId),
  );

  if (nextMentionedUserIds.length > 0) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, name")
      .eq("id", updatedNote.projectId)
      .maybeSingle();

    const { data: author } = await supabaseAdmin
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    await notifyMentionedUsers({
      projectId: updatedNote.projectId,
      projectName: project?.name || "a project",
      authorId: userId,
      authorName: author?.full_name || "Someone",
      noteId: updatedNote.id,
      mentionedUserIds: nextMentionedUserIds,
    });
  }

  return updatedNote;
}

/**
 * Delete a note
 */
export async function deleteNote(
  noteId: string,
  userId: string,
  authUser: AuthUser,
): Promise<void> {
  // Get existing note
  const existing = await getNoteById(noteId);

  // Only author or admin/manager can delete
  if (
    existing.userId !== userId &&
    authUser.role !== USER_ROLES.ADMIN &&
    authUser.role !== USER_ROLES.MANAGER
  ) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "You can only delete your own notes",
    );
  }

  const { error } = await supabaseAdmin
    .from("project_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Pin a note (Manager/Admin only)
 */
export async function pinNote(noteId: string): Promise<ProjectNote> {
  const { error } = await supabaseAdmin
    .from("project_notes")
    .update({ is_pinned: true })
    .eq("id", noteId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getNoteById(noteId);
}

/**
 * Unpin a note (Manager/Admin only)
 */
export async function unpinNote(noteId: string): Promise<ProjectNote> {
  const { error } = await supabaseAdmin
    .from("project_notes")
    .update({ is_pinned: false })
    .eq("id", noteId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getNoteById(noteId);
}

/**
 * Check if user has access to project notes
 * User must be admin, project manager, or a project member
 */
export async function checkProjectAccess(
  projectId: string,
  authUser: AuthUser,
): Promise<boolean> {
  // Admin has access to everything
  if (authUser.role === USER_ROLES.ADMIN) {
    return true;
  }

  // Check if user is project manager
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("manager_id")
    .eq("id", projectId)
    .single();

  if (project?.manager_id === authUser.id) {
    return true;
  }

  // Check if user is a project member
  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  return !!member;
}
