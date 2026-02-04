import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/responses.js";

type ValidationTarget = "body" | "query" | "params";

// Extend Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: Record<string, unknown>;
      validatedParams?: Record<string, unknown>;
    }
  }
}

/**
 * Format Zod errors into a readable format
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path]!.push(issue.message);
  }

  return formatted;
}

/**
 * Create validation middleware for a specific target
 */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[target];
    const result = schema.safeParse(data);

    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      throw ApiError.validation(formatted);
    }

    // For body, we can replace it directly (it's writable)
    // For query and params in Express 5.x, they are read-only, so we store in custom properties
    if (target === "body") {
      req.body = result.data;
    } else if (target === "query") {
      // Store validated query in a custom property and also merge into the original
      req.validatedQuery = result.data as Record<string, unknown>;
      // Copy validated properties back to req.query object (mutating its properties, not reassigning)
      Object.keys(result.data as object).forEach((key) => {
        (req.query as Record<string, unknown>)[key] = (
          result.data as Record<string, unknown>
        )[key];
      });
    } else if (target === "params") {
      req.validatedParams = result.data as Record<string, unknown>;
      Object.keys(result.data as object).forEach((key) => {
        (req.params as Record<string, unknown>)[key] = (
          result.data as Record<string, unknown>
        )[key];
      });
    }

    next();
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, "body");
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, "query");
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, "params");
}

/**
 * Validate multiple targets at once
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, Record<string, string[]>> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors["body"] = formatZodErrors(result.error);
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors["query"] = formatZodErrors(result.error);
      } else {
        req.validatedQuery = result.data as Record<string, unknown>;
        Object.keys(result.data as object).forEach((key) => {
          (req.query as Record<string, unknown>)[key] = (
            result.data as Record<string, unknown>
          )[key];
        });
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors["params"] = formatZodErrors(result.error);
      } else {
        req.validatedParams = result.data as Record<string, unknown>;
        Object.keys(result.data as object).forEach((key) => {
          (req.params as Record<string, unknown>)[key] = (
            result.data as Record<string, unknown>
          )[key];
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      throw ApiError.validation(errors);
    }

    next();
  };
}
