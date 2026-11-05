import { loadEnv, serveProduction } from './http.mjs';
loadEnv();
const {
  default: handler
} = await import('../api/chat.js');
await serveProduction(handler);
