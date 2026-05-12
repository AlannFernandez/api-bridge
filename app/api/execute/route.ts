import { z } from "zod";
import { NextResponse } from "next/server";

const executeSchema = z.object({
  type: z.enum(["REST", "SOAP"]).default("REST"),
  baseUrl: z.string().url(),
  path: z.string().default(""),
  routeVariables: z.record(z.string()).optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  headers: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  body: z.any().optional(),
  wsdl: z.string().optional(),
});

function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return response.text().then((text) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  });
}

function normalizeUrlSegments(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return trimmedPath ? `${trimmedBase}/${trimmedPath}` : trimmedBase;
}

function replaceRouteVariables(path: string, routeVariables: Record<string, string> = {}) {
  return path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = routeVariables[key];
    return value !== undefined ? encodeURIComponent(value) : `{${key}}`;
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parseResult = executeSchema.safeParse(payload);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        status: 0,
        data: { error: "Invalid request payload", issues: parseResult.error.format() },
        headers: {},
        latency: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  const { type, baseUrl, path, routeVariables = {}, method, headers = {}, params = {}, body } = parseResult.data;
  const start = Date.now();

  const requestHeaders = { ...headers };
  if (type === "SOAP" && body && !Object.keys(requestHeaders).some((key) => key.toLowerCase() === "content-type")) {
    requestHeaders["Content-Type"] = "text/xml;charset=utf-8";
  }

  const fullPath = replaceRouteVariables(path, routeVariables);
  const targetUrl = normalizeUrlSegments(baseUrl, fullPath);

  const urlWithParams = new URL(targetUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlWithParams.searchParams.set(key, String(value));
    }
  });

  try {
    const response = await fetch(urlWithParams.toString(), {
      method,
      headers: requestHeaders,
      body: method === "GET" || method === "DELETE" ? undefined : body,
    });

    const responseBody = await parseResponseBody(response);
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json(
      {
        status: response.status,
        data: responseBody,
        headers: responseHeaders,
        latency: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        status: 0,
        data: { error: message },
        headers: {},
        latency: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
