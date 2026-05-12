import { getValueByPath } from "./transform";

export interface VariableContext {
  secrets: Record<string, string>;
  runtime: Record<string, string>;
  nodes: Record<string, unknown>;
}

const TEMPLATE_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

export function resolveTemplateValue(template: unknown, context: VariableContext): unknown {
  if (typeof template !== "string") return template;

  let result = template;
  let hasInterpolation = false;
  let match: RegExpExecArray | null;

  while ((match = TEMPLATE_REGEX.exec(template)) !== null) {
    const expression = match[1].trim();
    let value: unknown;

    if (expression.startsWith("secrets.")) {
      value = context.secrets[expression.replace(/^secrets\./, "")];
    } else if (expression.startsWith("runtime.")) {
      value = context.runtime[expression.replace(/^runtime\./, "")];
    } else if (expression.includes(".")) {
      const [nodeId, ...pathParts] = expression.split(".");
      const path = pathParts.join(".");
      const nodeValue = context.nodes[nodeId];
      value = getValueByPath(nodeValue, path);
    } else {
      value = context.runtime[expression] ?? context.secrets[expression];
    }

    if (value !== undefined) {
      hasInterpolation = true;
      result = result.replace(match[0], String(value));
    }
  }

  if (hasInterpolation) {
    if (result === template && typeof result === "string") {
      return template;
    }
    return result;
  }

  return template;
}

export function resolveObjectTemplates(value: unknown, context: VariableContext): unknown {
  if (typeof value === "string") {
    return resolveTemplateValue(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveObjectTemplates(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, resolveObjectTemplates(item, context)])
    );
  }

  return value;
}

export function maskSecret(value: string, secrets: Record<string, string>) {
  if (!value || typeof value !== "string") return value;
  const hasSecretReference = /\{\{\s*secrets\.[^}]+\s*\}\}/.test(value);
  return hasSecretReference ? value : "••••••••";
}
