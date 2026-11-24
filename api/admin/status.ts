import type { ServerResponse } from 'node:http';
import type { NodeApiRequest } from '../../server/nodeHttpAdapter.ts';
import { getBearerHeader, sendJson } from '../../server/nodeHttpAdapter.ts';
import { handleGetAdminStatus } from '../../server/siteStatusService.ts';

export default async function handler(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }
  const result = await handleGetAdminStatus(getBearerHeader(req.headers));
  sendJson(res, result.statusCode, result.body);
}
