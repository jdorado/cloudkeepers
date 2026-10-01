import { verifyToken } from '@clerk/backend';
import { savesCollection } from '../server/database.js';
import { MAX_BYTES, readAccount, writeAccount } from '../server/save-service.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  if (!['GET', 'PUT'].includes(req.method)) { res.setHeader('Allow', 'GET, PUT'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const authorizedParties = (process.env.APP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!process.env.CLERK_SECRET_KEY || !process.env.MONGODB_URI || !authorizedParties.length) return res.status(503).json({ error: 'Online saves are not configured. Your device save is safe.' });
  let identity;
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new Error('Missing token');
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, authorizedParties });
    if (!claims.sub || !claims.sid || !authorizedParties.includes(claims.azp)) throw new Error('Invalid session');
    identity = claims.sub;
  } catch { return res.status(401).json({ error: 'Sign in again to save online.' }); }
  try {
    if (Number(req.headers['content-length']) > MAX_BYTES) return res.status(413).json({ error: 'This save is too large.' });
    const collection = await savesCollection();
    if (req.method === 'GET') return res.status(200).json(await readAccount(collection, identity));
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await writeAccount(collection, identity, input);
    return res.status(result.status).json(result.body);
  } catch { return res.status(503).json({ error: 'Online saving is unavailable. Your device save is safe; try again.' }); }
}
