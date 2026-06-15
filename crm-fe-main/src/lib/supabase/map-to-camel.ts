// ===================
// UTILITY: snake_case → camelCase mapper
// ===================

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert all snake_case keys in an object to camelCase.
 * Handles arrays, nested objects, and null/undefined.
 */
export function mapToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(mapToCamelCase) as T;
  if (typeof obj !== "object" || obj instanceof Date) return obj;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] =
      typeof value === "object" && value !== null && !(value instanceof Date)
        ? mapToCamelCase(value)
        : value;
  }
  return result as T;
}