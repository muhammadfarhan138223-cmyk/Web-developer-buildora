export const MAX_BYTES = 3 * 1024 * 1024;
export function validPath(path) {
  return typeof path === 'string' && path.length > 0 && path.length < 240 && !/[:\\\x00-\x1f]/.test(path) && !path.startsWith('/') && path.split('/').every(p => p && !['.', '..', '__proto__', 'constructor', 'prototype', 'node_modules', '.git'].includes(p)) && !path.split('/').some(p => /^\.env(?:\.|$)/.test(p) && p !== '.env.example');
}
export function validateFiles(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Project files must be an object of file paths and text.');
  const entries = Object.entries(files);
  if (entries.length > 400) throw new Error('Maximum 400 project files supported.');
  let size = 0;
  for (const [path, content] of entries) {
    if (!validPath(path) || typeof content !== 'string') throw new Error(`Unsupported file: ${path}`);
    size += new TextEncoder().encode(content).length;
  }
  if (size > MAX_BYTES) throw new Error('Project exceeds the 3 MB workspace limit. Remove large assets first.');
  return files;
}
export function applyChanges(files, operations) {
  const next = {
    ...files
  };
  for (const op of operations) {
    if (!validPath(op.path)) throw new Error(`Invalid file path: ${op.path}`);
    if (op.type === 'write' && typeof op.content === 'string') next[op.path] = op.content;else if (op.type === 'delete') delete next[op.path];else throw new Error('Invalid file operation.');
  }
  return validateFiles(next);
}
