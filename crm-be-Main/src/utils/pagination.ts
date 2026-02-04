import { PAGINATION } from "../config/constants.js";
import type { PaginationMeta, PaginationParams } from "../types/api.types.js";

/**
 * Parse pagination params from query string
 */
export function parsePaginationParams(query: {
  page?: string;
  limit?: string;
}): PaginationParams {
  const page = Math.max(
    1,
    parseInt(query.page || String(PAGINATION.DEFAULT_PAGE), 10)
  );
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit || String(PAGINATION.DEFAULT_LIMIT), 10))
  );
  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPrevPage: params.page > 1,
  };
}

/**
 * Calculate offset for database query
 */
export function calculateOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

/**
 * Parse sort params from query string
 */
export function parseSortParams(
  query: { sortBy?: string; sortOrder?: string },
  allowedFields: string[],
  defaultField: string = "created_at"
): { sortBy: string; ascending: boolean } {
  const sortBy = allowedFields.includes(query.sortBy || "")
    ? query.sortBy!
    : defaultField;
  const ascending = query.sortOrder?.toLowerCase() === "asc";
  return { sortBy, ascending };
}

/**
 * Parse array query param (handles both comma-separated and array)
 */
export function parseArrayParam(
  value: string | string[] | undefined
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Parse boolean query param
 */
export function parseBooleanParam(
  value: string | undefined
): boolean | undefined {
  if (value === undefined) return undefined;
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Parse date range from query params
 */
export function parseDateRange(query: {
  startDate?: string;
  endDate?: string;
}): { startDate?: Date; endDate?: Date } {
  const result: { startDate?: Date; endDate?: Date } = {};

  if (query.startDate) {
    const parsed = new Date(query.startDate);
    if (!isNaN(parsed.getTime())) {
      result.startDate = parsed;
    }
  }

  if (query.endDate) {
    const parsed = new Date(query.endDate);
    if (!isNaN(parsed.getTime())) {
      result.endDate = parsed;
    }
  }

  return result;
}
