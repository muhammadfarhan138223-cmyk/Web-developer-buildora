import { WebContainer, configureAPIKey } from '@webcontainer/api';
import { validateFiles } from './files.js';
let instancePromise;
export function disposeRuntime(instance) {
  instance.teardown();
  instancePromise = null;
}
if (import.meta.env.VITE_WEBCONTAINER_API_KEY) configureAPIKey(import.meta.env.VITE_WEBCONTAINER_API_KEY);
export function bootRuntime() {
  if (!window.crossOriginIsolated) throw new Error('Runtime needs cross-origin isolation. Start with npm run dev or serve with the supplied hosting headers, then use Chrome or Edge.');
  if (!instancePromise) instancePromise = new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error('The browser runtime did not connect within 45 seconds. Check your internet and browser privacy settings, then reload this page to retry. You can still export and run this project locally.'));
    }, 45000);
    WebContainer.boot({coep: 'credentialless', forwardPreviewErrors: true}).then(instance => {
      clearTimeout(timer);
      if (expired) instance.teardown(); else resolve(instance);
    }, error => {clearTimeout(timer); if (!expired) {instancePromise = null; reject(error);}});
  });
  return instancePromise;
}
export function fileTree(files) {
  validateFiles(files);
  const root = Object.create(null);
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (node[part]?.file) throw new Error(`File/folder conflict: ${path}`);
      node[part] ||= {
        directory: Object.create(null)
      };
      node = node[part].directory;
    }
    const name = parts.at(-1);
    if (node[name]?.directory) throw new Error(`File/folder conflict: ${path}`);
    const match = content.match(/^data:[^;]+;base64,(.*)$/s);
    node[name] = {
      file: {
        contents: match ? Uint8Array.from(atob(match[1]), c => c.charCodeAt(0)) : content
      }
    };
  }
  return root;
}
