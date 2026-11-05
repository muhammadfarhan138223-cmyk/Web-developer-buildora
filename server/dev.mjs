import { loadEnv, handleApi, headers } from './http.mjs';
import config from '../vite.config.js';
loadEnv();
const {
  default: handler
} = await import('../api/chat.js');
const {
  createServer
} = await import('vite');
const server = await createServer({
  ...config,
  configFile: false,
  server: {
    ...config.server,
    host: '127.0.0.1',
    headers
  },
  plugins: [...config.plugins, {
    name: 'buildora-api',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => req.url.startsWith('/api/') ? handleApi(req, res, handler) : next());
    }
  }]
});
await server.listen();
server.printUrls();
