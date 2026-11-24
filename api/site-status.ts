import type { ServerResponse } from 'node:http';
import type { NodeApiRequest } from '../server/nodeHttpAdapter.ts';
import { sendJson } from '../server/nodeHttpAdapter.ts';
import { handlePublicSiteStatus } from '../server/siteStatusService.ts';

export default async function handler(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }
  const payload = await handlePublicSiteStatus();
  sendJson(res, 200, payload);
}
