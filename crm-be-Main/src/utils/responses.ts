import type { Response } from "express";
import type { ApiResponse, PaginationMeta } from "../types/api.types.js";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_STATUS_CODES,
  type ErrorCode,
} from "./error-codes.js";

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message || ERROR_MESSAGES[code]);
    this.code = code;
    this.statusCode = ERROR_STATUS_CODES[code];
    this.details = details;
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message?: string, details?: unknown): ApiError {
    return new ApiError(ERROR_CODES.INVALID_INPUT, message, details);
  }

  static unauthorized(
    code: ErrorCode = ERROR_CODES.AUTH_TOKEN_INVALID
  ): ApiError {
    return new ApiError(code);
  }

  static forbidden(message?: string): ApiError {
    return new ApiError(ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(resource: string = "Resource"): ApiError {
    return new ApiError(ERROR_CODES.NOT_FOUND, `${resource} not found`);
  }

  static conflict(message?: string): ApiError {
    return new ApiError(ERROR_CODES.CONFLICT, message);
  }

  static internal(message?: string): ApiError {
    return new ApiError(ERROR_CODES.INTERNAL_ERROR, message);
  }

  static validation(details: unknown): ApiError {
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, undefined, details);
  }

  static bulkLimitExceeded(limit: number): ApiError {
    return new ApiError(
      ERROR_CODES.BULK_LIMIT_EXCEEDED,
      `Bulk operation limit of ${limit} records exceeded`
    );
  }
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  // Add request ID if available
  const requestId = res.getHeader("X-Request-ID");
  if (requestId) {
    response.requestId = requestId as string;
  }

  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  error: ApiError | Error,
  requestId?: string
): void {
  let response: ApiResponse;
  let statusCode: number;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    response = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  } else {
    statusCode = 500;
    response = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    };
  }

  if (requestId) {
    response.requestId = requestId;
  }

  res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta
): void {
  sendSuccess(res, data, 200, meta);
}

/**
 * Send created response
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

/**
 * Send no content response
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}
