import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  uploadedBy: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface FileInsert {
  project_id: string;
  name: string;
  file_type?: string | null;
  file_size?: number | null;
  storage_path: string;
  uploaded_by?: string | null;
  description?: string | null;
}

function mapFileRow(row: any): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploader: row.uploader
      ? {
          id: row.uploader.id,
          fullName: row.uploader.full_name,
          avatarUrl: row.uploader.avatar_url,
        }
      : undefined,
  };
}

/**
 * Get all files for a project
 */
export async function getProjectFiles(
  projectId: string,
): Promise<ProjectFile[]> {
  const { data, error } = await supabaseAdmin
    .from("project_files")
    .select(
      `
      *,
      uploader:users!uploaded_by(id, full_name, avatar_url)
    `,
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row: any) => mapFileRow(row));
}

/**
 * Upload a file to a project
 * Note: Actual file upload to storage should be handled separately.
 * This function stores the metadata.
 */
export async function createProjectFile(input: {
  projectId: string;
  name: string;
  fileType?: string;
  fileSize?: number;
  storagePath: string;
  uploadedBy: string;
  description?: string;
}): Promise<ProjectFile> {
  const insertData: FileInsert = {
    project_id: input.projectId,
    name: input.name,
    file_type: input.fileType,
    file_size: input.fileSize,
    storage_path: input.storagePath,
    uploaded_by: input.uploadedBy,
    description: input.description,
  };

  const { data, error } = await supabaseAdmin
    .from("project_files")
    .insert(insertData)
    .select(
      `
      *,
      uploader:users!uploaded_by(id, full_name, avatar_url)
    `,
    )
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapFileRow(data);
}

/**
 * Delete a file from a project
 */
export async function deleteProjectFile(
  fileId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  // First check if the file exists and user has permission
  const { data: file, error: fetchError } = await supabaseAdmin
    .from("project_files")
    .select("id, uploaded_by, project_id")
    .eq("id", fileId)
    .single();

  if (fetchError || !file) {
    throw ApiError.notFound("File");
  }

  // Check if user is allowed to delete (file uploader or admin)
  if (!isAdmin && file.uploaded_by !== userId) {
    // Check if user is project manager
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("manager_id")
      .eq("id", file.project_id)
      .single();

    if (!project || project.manager_id !== userId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You are not authorized to delete this file",
      );
    }
  }

  // Delete from database (storage cleanup should be handled separately)
  const { error } = await supabaseAdmin
    .from("project_files")
    .delete()
    .eq("id", fileId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Upload file to Supabase Storage and return the path
 */
export async function uploadToStorage(
  projectId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const bucket = "project-files";
  const filePath = `${projectId}/${Date.now()}_${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      `Storage upload failed: ${error.message}`,
    );
  }

  return filePath;
}

/**
 * Get a signed URL for downloading a file
 */
export async function getFileDownloadUrl(storagePath: string): Promise<string> {
  const bucket = "project-files";

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      `Failed to create download URL: ${error.message}`,
    );
  }

  return data.signedUrl;
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
  const bucket = "project-files";

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      `Storage deletion failed: ${error.message}`,
    );
  }
}
