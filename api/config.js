export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ pilotMode: (process.env.CLERK_PUBLISHABLE_KEY || '').startsWith('pk_test_'), publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '', cloudEnabled: Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY && process.env.MONGODB_URI && process.env.APP_ORIGINS) });
}
