import { crossGameContext, linkLearner } from '../server/cross-game-learning.js';
import { verifyToken } from '@clerk/backend';
import { savesCollection, learningCollection, learnersCollection } from '../server/database.js';

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
    if (req.method === 'PUT') {
      if (Number(req.headers['content-length']) > 4096) return res.status(413).json({ error: 'Request too large.' });
      const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (JSON.stringify(input || {}).length > 4096) return res.status(413).json({ error: 'Request too large.' });
      const result = await linkLearner(await savesCollection(), await learnersCollection(), identity, input);
      return res.status(result.status).json(result.body);
    }
    const cursor = new URL(req.url, 'https://game.invalid').searchParams.get('cursor') || '';
    if (cursor && !/^[a-f0-9]{64}$/.test(cursor)) return res.status(400).json({ error: 'Invalid cursor.' });
    return res.status(200).json(await crossGameContext(await savesCollection(), await learningCollection(), await learnersCollection(), identity, cursor));
  } catch { return res.status(503).json({ error: 'Online saving is unavailable. Your device save is safe; try again.' }); }
}
