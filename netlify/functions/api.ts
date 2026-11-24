import {
  handleGetAdminStatus,
  handlePublicSiteStatus,
  handleSyncAdminFirebase,
  handleUpdateAdminSiteStatus,
} from '../../server/siteStatusService.ts';

interface NetlifyEvent {
  httpMethod?: string;
  path?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function jsonResponse(statusCode: number, body: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event: NetlifyEvent): unknown {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeRoute(rawPath: string | undefined): string {
  const path = (rawPath || '').replace(/\/+$/, '');
  const fnPrefix = '/.netlify/functions/api';
  if (path.startsWith(fnPrefix)) {
    return path.slice(fnPrefix.length) || '/';
  }
  if (path.startsWith('/api')) {
    return path.slice('/api'.length) || '/';
  }
  return path || '/';
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = normalizeRoute(event.path);
  const authHeader =
    event.headers?.authorization ?? event.headers?.Authorization;

  if (route === '/site-status' && method === 'GET') {
    const payload = await handlePublicSiteStatus();
    return jsonResponse(200, payload);
  }

  if (route === '/admin/status' && method === 'GET') {
    const result = await handleGetAdminStatus(authHeader);
    return jsonResponse(result.statusCode, result.body);
  }

  if (route === '/admin/site-status' && method === 'PUT') {
    const result = await handleUpdateAdminSiteStatus(
      authHeader,
      parseBody(event),
    );
    return jsonResponse(result.statusCode, result.body);
  }

  if (route === '/admin/sync-firebase' && method === 'POST') {
    const result = await handleSyncAdminFirebase(authHeader, parseBody(event));
    return jsonResponse(result.statusCode, result.body);
  }

  return jsonResponse(404, { error: 'Not Found' });
}
