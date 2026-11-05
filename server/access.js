import {cloudConfig} from './cloud-config.js';
const buckets = new Map();
import { authMode } from './config.js';
export async function authorize(req, requireAccount = false) {
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
  if (!requireAccount && process.env.ALLOW_LOCAL_GUEST === 'true' && local && !process.env.VERCEL) return 'local-developer';
  if (authMode() === 'local') {
    const {sessionUser} = await import('./local-backend.js');
    const user = sessionUser(req);
    if (!user) throw Object.assign(new Error('Please sign in before generating code.'), {status:401});
    return user.id;
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || cloudConfig.url;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || cloudConfig.publicKey;
  if (!url || !key) throw Object.assign(new Error('Configure Supabase authentication on the server before using AI.'), {
    status: 503
  });
  const token = req.headers.authorization;
  if (!token?.startsWith('Bearer ') || token.length > 8192) throw Object.assign(new Error('Sign in before using AI generation.'), {
    status: 401
  });
  const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: token
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw Object.assign(new Error('Your session expired. Please sign in again.'), {
    status: 401
  });
  const user = await response.json();
  if (!user.id) throw Object.assign(new Error('Invalid user session.'), {
    status: 401
  });
  return user.id;
}
export function enforceLimit(key, now = Date.now()) {
  for (const [id, bucket] of buckets) if (now - bucket.start > 60000) buckets.delete(id);
  const bucket = buckets.get(key) || {
    start: now,
    count: 0
  };
  if (buckets.size >= 10000 && !buckets.has(key)) return false;
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count <= 12;
}
export function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object.');
  if (JSON.stringify(body).length > 150000) throw new Error('Request context is too large.');
  const context = body.projectContext;
  if (context && (typeof context !== 'object' || Array.isArray(context) || context.files && (!Array.isArray(context.files) || context.files.length > 400 || context.files.some(f => !f || typeof f.path !== 'string' || typeof f.content !== 'string')))) throw new Error('Invalid project context.');
}
