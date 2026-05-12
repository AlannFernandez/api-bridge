/**
 * Data Transformation Engine
 * Handles JSON flattening, field mapping, type casting, and output generation
 */

export type FieldType = "string" | "number" | "boolean" | "date";

export interface FieldMapping {
  id: string;
  nodeId: string; // Source node ID
  from: string; // JSONPath or simple path (e.g., "user.name", "results[0].id")
  to: string; // Output field name
  type: FieldType;
  optional?: boolean;
}

/**
 * Template resolution for complex value expressions
 * Supports: {{nodeId.field}}, {{nodeId.nested.path[0].name}}
 * Can concatenate: "User: {{node1.name}}, City: {{node2.city}}"
 */
export function resolveTemplate(template: string, workflowContext: Record<string, unknown>): unknown {
  if (typeof template !== "string") return template;

  // If no template syntax, return as is
  if (!template.includes("{{")) return template;

  let result = template;
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  let hasInterpolation = false;

  while ((match = regex.exec(template)) !== null) {
    const expression = match[1]; // e.g., "nodeId.field"
    const [nodeId, ...pathParts] = expression.split(".");
    const path = pathParts.join(".");

    const nodeData = workflowContext[nodeId];
    const value = getValueByPath(nodeData, path);

    if (value !== undefined) {
      result = result.replace(match[0], String(value));
      hasInterpolation = true;
    }
  }

  return hasInterpolation ? result : template;
}

/**
 * Flatten a JSON object into dot-notation paths
 * Example: { user: { name: "John", posts: [{ id: 1 }] } }
 * Returns: ["user.name", "user.posts", "user.posts[0].id"]
 */
export function flattenSchema(
  obj: unknown,
  prefix = "",
  depth = 0,
  maxDepth = 5
): string[] {
  const paths: string[] = [];

  if (depth > maxDepth) return paths;
  if (obj === null || obj === undefined) return paths;

  if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      paths.push(`${prefix}[]`); // Mark array
      if (obj.length > 0) {
        const arrPaths = flattenSchema(obj[0], `${prefix}[0]`, depth + 1, maxDepth);
        paths.push(...arrPaths);
      }
    } else {
      const keys = Object.keys(obj);
      for (const key of keys) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        paths.push(newPrefix);

        const value = (obj as Record<string, unknown>)[key];
        if (value && typeof value === "object") {
          const nestedPaths = flattenSchema(value, newPrefix, depth + 1, maxDepth);
          paths.push(...nestedPaths);
        }
      }
    }
  }

  return paths;
}

/**
 * Get a value from a JSON object using a path
 * Supports: "user.name", "results[0].id", "data.items[]"
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const segments = path.split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;

    // Handle array indexing: "items[0]"
    const arrayMatch = segment.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      if (typeof current === "object") {
        current = (current as Record<string, unknown>)[key];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    } else if (segment === "[]") {
      // Mark that this is an array - return as is
      return current;
    } else {
      // Simple property access
      if (typeof current === "object") {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * Cast a value to the specified type
 */
export function castValue(value: unknown, type: FieldType): unknown {
  if (value === null || value === undefined) return null;

  switch (type) {
    case "string":
      return String(value);
    case "number":
      const num = Number(value);
      return isNaN(num) ? null : num;
    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "string")
        return value.toLowerCase() === "true" || value === "1";
      return Boolean(value);
    case "date":
      const date = new Date(String(value));
      return isNaN(date.getTime()) ? null : date.toISOString();
    default:
      return value;
  }
}

/**
 * Apply transformation rules using workflowContext
 * Supports multi-source aggregation and template resolution
 */
export function applyTransform(
  workflowContext: Record<string, unknown>,
  mappings: FieldMapping[]
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (!mapping.to.trim()) continue;

    try {
      const nodeData = workflowContext[mapping.nodeId];
      if (nodeData === undefined) {
        if (!mapping.optional) {
          output[mapping.to] = null;
        }
        continue;
      }

      let value = getValueByPath(nodeData, mapping.from);

      // Resolve templates if value is a string
      if (typeof value === "string" && value.includes("{{")) {
        value = resolveTemplate(value, workflowContext);
      }

      if (value === undefined) {
        if (!mapping.optional) {
          output[mapping.to] = null;
        }
      } else {
        output[mapping.to] = castValue(value, mapping.type);
      }
    } catch {
      if (!mapping.optional) {
        output[mapping.to] = null;
      }
    }
  }

  return output;
}

/**
 * Generate a preview of the transformed output
 * This is useful for displaying in UI before applying transformation
 */
export function generateTransformPreview(
  workflowContext: Record<string, unknown>,
  mappings: FieldMapping[]
): { output: Record<string, unknown>; errors: string[]; sources: Record<string, string> } {
  const errors: string[] = [];
  const output: Record<string, unknown> = {};
  const sources: Record<string, string> = {}; // Track which node each output came from

  for (const mapping of mappings) {
    if (!mapping.to.trim()) continue;

    try {
      const nodeData = workflowContext[mapping.nodeId];

      if (nodeData === undefined) {
        if (!mapping.optional) {
          output[mapping.to] = null;
          sources[mapping.to] = `${mapping.nodeId} (missing)`;
          errors.push(`Missing source node: ${mapping.nodeId}`);
        }
        continue;
      }

      let value = getValueByPath(nodeData, mapping.from);

      // Resolve templates
      if (typeof value === "string" && value.includes("{{")) {
        value = resolveTemplate(value, workflowContext);
      }

      if (value === undefined) {
        if (!mapping.optional) {
          output[mapping.to] = null;
          sources[mapping.to] = `${mapping.nodeId}.${mapping.from} (missing)`;
        }
      } else {
        output[mapping.to] = castValue(value, mapping.type);
        sources[mapping.to] = `${mapping.nodeId}.${mapping.from}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Error mapping ${mapping.nodeId}.${mapping.from}: ${message}`);
      if (!mapping.optional) {
        output[mapping.to] = null;
        sources[mapping.to] = "error";
      }
    }
  }

  return { output, errors, sources };
}
