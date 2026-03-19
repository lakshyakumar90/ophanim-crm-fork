import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { getCurrentTimestamp } from "../utils/helpers.js";

export interface TeamNote {
  id: string;
  content: string;
  teamId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export async function getTeamNotes(teamId: string): Promise<TeamNote[]> {
  const { data, error } = await supabaseAdmin
    .from("team_notes")
    .select(
      `
      *,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `,
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((note: any) => ({
    id: note.id,
    content: note.content,
    teamId: note.team_id,
    userId: note.user_id,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    user: note.user
      ? {
          id: note.user.id,
          fullName: note.user.full_name,
          avatarUrl: note.user.avatar_url,
        }
      : undefined,
  }));
}

export async function createTeamNote(
  teamId: string,
  userId: string,
  content: string,
): Promise<TeamNote> {
  const { data, error } = await supabaseAdmin
    .from("team_notes")
    .insert({
      team_id: teamId,
      user_id: userId,
      content,
    })
    .select(
      `
      *,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `,
    )
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    content: data.content,
    teamId: data.team_id,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.user
      ? {
          id: data.user.id,
          fullName: data.user.full_name,
          avatarUrl: data.user.avatar_url,
        }
      : undefined,
  };
}

export async function updateTeamNote(
  noteId: string,
  content: string,
): Promise<TeamNote> {
  const { data, error } = await supabaseAdmin
    .from("team_notes")
    .update({
      content,
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", noteId)
    .select(
      `
      *,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `,
    )
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    content: data.content,
    teamId: data.team_id,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.user
      ? {
          id: data.user.id,
          fullName: data.user.full_name,
          avatarUrl: data.user.avatar_url,
        }
      : undefined,
  };
}

export async function deleteTeamNote(noteId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("team_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

export async function pinTeamNote(noteId: string): Promise<TeamNote> {
  const { data, error } = await supabaseAdmin
    .from("team_notes")
    .update({ is_pinned: true })
    .eq("id", noteId)
    .select(`
      *,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    content: data.content,
    teamId: data.team_id,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.user ? { id: data.user.id, fullName: data.user.full_name, avatarUrl: data.user.avatar_url } : undefined,
  };
}

export async function unpinTeamNote(noteId: string): Promise<TeamNote> {
  const { data, error } = await supabaseAdmin
    .from("team_notes")
    .update({ is_pinned: false })
    .eq("id", noteId)
    .select(`
      *,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    content: data.content,
    teamId: data.team_id,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.user ? { id: data.user.id, fullName: data.user.full_name, avatarUrl: data.user.avatar_url } : undefined,
  };
}
