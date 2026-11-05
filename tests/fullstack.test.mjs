import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fullstackFiles } from '../src/lib/templates.js';
test('full-stack starter serves HTML and stores notes through its real API', async () => {
  const prefix = path.join(os.tmpdir(), 'buildora-test-');
  const directory = await mkdtemp(prefix);
  let child;
  try {
    await writeFile(path.join(directory, 'index.html'), fullstackFiles['index.html']);
    const source = fullstackFiles['server.js'].replace("server.listen(3000, '0.0.0.0');", "server.listen(0, '127.0.0.1', () => console.log(server.address().port));");
    child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      cwd: directory,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Starter did not start')), 15000);
      child.once('error', e => {
        clearTimeout(timer);
        reject(e);
      });
      child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('Starter exited early'));
      });
      child.stdout.once('data', data => {
        clearTimeout(timer);
        resolve(Number(String(data).trim()));
      });
    });
    const url = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(url)).status, 200);
    assert.deepEqual(await (await fetch(url + '/api/notes')).json(), []);
    const result = await fetch(url + '/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'A tested note'
      })
    });
    assert.equal(result.status, 200);
    assert.equal((await result.json())[0].text, 'A tested note');
    assert.equal((await (await fetch(url + '/api/notes')).json()).length, 1);
    assert.equal((await fetch(url + '/api/notes', {
      method: 'POST',
      body: 'bad'
    })).status, 400);
    assert.equal((await fetch(url + '/not-found')).status, 404);
  } finally {
    if (child && child.exitCode === null) await new Promise(resolve => {
      child.once('exit', resolve);
      child.kill();
    });
    if (path.resolve(directory).startsWith(path.resolve(prefix))) await rm(directory, {
      recursive: true,
      force: true
    });
  }
});
