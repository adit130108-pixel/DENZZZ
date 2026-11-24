import type { ServerResponse } from 'node:http';
import type { NodeApiRequest } from '../../server/nodeHttpAdapter.ts';
import {
  getBearerHeader,
  readJsonBody,
  sendJson,
} from '../../server/nodeHttpAdapter.ts';
import { handleUpdateAdminSiteStatus } from '../../server/siteStatusService.ts';

export default async function handler(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }
  try {
    const body = await readJsonBody(req);
    const result = await handleUpdateAdminSiteStatus(
      getBearerHeader(req.headers),
      body,
    );
    sendJson(res, result.statusCode, result.body);
  } catch {
    sendJson(res, 400, { error: 'Invalid request body' });
  }
}
