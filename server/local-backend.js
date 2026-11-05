import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, chmodSync } from 'node:fs'
import path from 'node:path'
import { randomBytes, randomUUID, scrypt, createHash, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { validateFiles } from '../src/lib/files.js'

const derive = promisify(scrypt), databases = new Map(), limits = new Map()
const SESSION_MS = 7 * 24 * 60 * 60 * 1000
let activeHashes = 0
const digest = value => createHash('sha256').update(value).digest('hex')
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
export function database() {
  if (process.env.VERCEL) fail('Local storage needs a persistent Node server. Configure Supabase for serverless hosting.', 503)
  const folder = path.resolve(process.env.BUILDORA_DATA_DIR || '.buildora')
  if (!databases.has(folder)) {
    mkdirSync(folder, { recursive: true, mode: 0o700 })
    const file = path.join(folder, 'buildora.sqlite'), db = new DatabaseSync(file)
    try { chmodSync(file, 0o600) } catch {}
    db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, recovery TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, files TEXT NOT NULL, messages TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS project_owner ON projects(user_id, updated_at);`)
    databases.set(folder, db)
  }
  return databases.get(folder)
}
export function closeDatabases() { for (const db of databases.values()) db.close(); databases.clear() }
function rate(req, kind, max = 20) {
  const now = Date.now(), key = `${kind}:${req.socket?.remoteAddress || 'unknown'}`
  for (const [k, v] of limits) if (now - v.start > 15 * 60 * 1000) limits.delete(k)
  if (!limits.has(key) && limits.size >= 10000) fail('Please try again later.', 429)
  const v = limits.get(key) || { start: now, count: 0 }; v.count++; limits.set(key, v)
  if (v.count > max) fail('Too many attempts. Try again in 15 minutes.', 429)
}
async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail('Use a password of 10–128 characters.')
  if (activeHashes >= 4) fail('Sign-in is busy. Please try again shortly.', 429)
  activeHashes++
  try { return `${salt}:${(await derive(password, salt, 64, { N:32768, r:8, p:3, maxmem:64 * 1024 * 1024 })).toString('hex')}` } finally { activeHashes-- }
}
function cookie(req, token, expires = SESSION_MS / 1000) {
  const secure = process.env.COOKIE_SECURE === 'true' || Boolean(req.socket?.encrypted) || process.env.SITE_URL?.startsWith('https://')
  return `buildora_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${expires}${secure ? '; Secure' : ''}`
}
export function sessionUser(req) {
  const token = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('buildora_session='))?.slice(17)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const db = database()
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
  return db.prepare('SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires_at > ?').get(digest(token), Date.now()) || null
}
function newSession(req, res, userId) {
  const db=database(), token=randomBytes(32).toString('hex')
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
  db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(digest(token),userId,Date.now()+SESSION_MS)
  res.setHeader('Set-Cookie',cookie(req,token))
}
export async function handleLocal(req, res, route) {
  const body=req.body || {}, db=database()
  if (route === '/api/auth/session' && req.method === 'GET') return res.json({user:sessionUser(req)})
  if (route === '/api/auth/logout' && req.method === 'POST') {
    const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('buildora_session='))?.slice(17)
    if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token))
    res.setHeader('Set-Cookie',cookie(req,'',0));return res.json({success:true})
  }
  if (['/api/auth/signup','/api/auth/login','/api/auth/recover'].includes(route) && req.method === 'POST') {
    rate(req,route,route.endsWith('recover')?6:20)
    const email=String(body.email || '').trim().toLowerCase()
    if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.')
    if(route.endsWith('signup')) {
      const password=await hashPassword(body.password), id=randomUUID(), recoveryCode=randomBytes(24).toString('hex')
      try {db.prepare('INSERT INTO users(id,email,password,recovery,created_at) VALUES(?,?,?,?,?)').run(id,email,password,digest(recoveryCode),new Date().toISOString())} catch(e) {if(e.code?.includes('SQLITE') || e.message.includes('UNIQUE')) fail('Unable to create this account. Try signing in or recovering your account.',409);throw e}
      newSession(req,res,id);return res.status(201).json({user:{id,email},recoveryCode})
    }
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email)
    if(route.endsWith('recover')) {
      const candidate=digest(String(body.recoveryCode || '').trim()), expected=user?.recovery || digest('unavailable')
      if(!timingSafeEqual(Buffer.from(candidate),Buffer.from(expected)) || !user) fail('Email or recovery code is incorrect.',401)
      const password=await hashPassword(body.password), recoveryCode=randomBytes(24).toString('hex')
      db.exec('BEGIN IMMEDIATE')
      try {db.prepare('UPDATE users SET password=?, recovery=? WHERE id=?').run(password,digest(recoveryCode),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.exec('COMMIT')} catch(e){db.exec('ROLLBACK');throw e}
      res.setHeader('Set-Cookie',cookie(req,'',0));return res.json({recoveryCode})
    }
    // Hash even unknown accounts to avoid a fast account-existence oracle.
    const stored=user?.password || `${'0'.repeat(32)}:${'0'.repeat(128)}`
    const computed=await hashPassword(body.password,stored.split(':')[0])
    if(!timingSafeEqual(Buffer.from(computed.split(':')[1],'hex'),Buffer.from(stored.split(':')[1],'hex')) || !user) fail('Email or password is incorrect.',401)
    newSession(req,res,user.id);return res.json({user:{id:user.id,email:user.email}})
  }
  if(!route.startsWith('/api/projects')) return res.status(404).json({error:'API route not found.'})
  const user=sessionUser(req);if(!user) fail('Please sign in to access saved projects.',401)
  if(route==='/api/projects' && req.method==='GET') return res.json({data:db.prepare('SELECT id,name,created_at,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC').all(user.id)})
  const match=route.match(/^\/api\/projects\/([a-zA-Z0-9_-]{8,80})(\/conversation)?$/)
  if(!match) fail('Project not found.',404)
  const [,id,conversation]=match, existing=db.prepare('SELECT * FROM projects WHERE id=?').get(id)
  if(existing && existing.user_id!==user.id) fail('Project not found.',404)
  if(conversation) {
    if(!existing) fail('Save the project first.',404)
    if(req.method==='GET') return res.json({data:[{messages:JSON.parse(existing.messages)}]})
    if(req.method==='PUT') {
      if(!Array.isArray(body.messages) || JSON.stringify(body.messages).length>1000000) fail('Conversation is too large.')
      db.prepare('UPDATE projects SET messages=?,updated_at=? WHERE id=? AND user_id=?').run(JSON.stringify(body.messages.slice(-200)),new Date().toISOString(),id,user.id)
      return res.json({data:{project_id:id}})
    }
  } else {
    if(req.method==='GET') {if(!existing) fail('Project not found.',404);return res.json({data:{...existing,files:JSON.parse(existing.files),messages:undefined}})}
    if(req.method==='PUT') {
      let files; try { files=validateFiles(body.files || {}) } catch(e) { fail(e.message) }
      const name=String(body.name || 'Untitled project').trim().slice(0,80),now=new Date().toISOString()
      if(!existing && db.prepare('SELECT COUNT(*) AS count FROM projects WHERE user_id=?').get(user.id).count>=50) fail('Maximum 50 saved projects. Delete or export older projects first.')
      db.prepare('INSERT INTO projects(id,user_id,name,files,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,files=excluded.files,updated_at=excluded.updated_at WHERE projects.user_id=excluded.user_id').run(id,user.id,name,JSON.stringify(files),now,now)
      return res.json({data:{id,name,files}})
    }
    if(req.method==='DELETE') {db.prepare('DELETE FROM projects WHERE id=? AND user_id=?').run(id,user.id);return res.json({success:true})}
  }
  return res.status(405).json({error:'Method not allowed.'})
}
