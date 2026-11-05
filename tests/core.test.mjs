import test from 'node:test';
import assert from 'node:assert/strict';
import { validPath, applyChanges, validateFiles } from '../src/lib/files.js';
import { parseAIResponse } from '../src/ai/responseParser.js';
import { scanProject } from '../src/lib/projectScanner.js';
import { enforceLimit, authorize, validateBody } from '../server/access.js';
import { buildStaticPreview } from '../src/lib/previewBuilder.js';
import { getModelChain } from '../src/ai/modelConfig.js';
import handler from '../api/chat.js';
test('file operations reject traversal, secrets and prototype paths', () => {
  for (const path of ['../x', '/x', 'C:/x', 'a\\b', '.env', 'a/.env.local', '__proto__/x', 'node_modules/x']) assert.equal(validPath(path), false, path);
  assert.equal(validPath('src/components/Card.jsx'), true);
  assert.throws(() => applyChanges({}, [{
    type: 'write',
    path: '../x',
    content: ''
  }]));
  assert.throws(() => validateFiles({
    'x': 'x'.repeat(4 * 1024 * 1024)
  }));
});
test('file changes are atomic, allow empty files and preserve unrelated files', () => {
  const before = {
    'a.js': 'original',
    'b.js': ''
  };
  assert.throws(() => applyChanges(before, [{
    type: 'write',
    path: 'a.js',
    content: 'new'
  }, {
    type: 'write',
    path: '../bad',
    content: ''
  }]));
  assert.equal(before['a.js'], 'original');
  assert.deepEqual(applyChanges(before, [{
    type: 'delete',
    path: 'a.js'
  }]), {
    'b.js': ''
  });
});
test('incomplete AI responses never become writable file operations', () => {
  const parsed = parseAIResponse('```file:src/app.js\nhello');
  assert.deepEqual(parsed.operations, []);
  assert.deepEqual(parsed.malformed, ['src/app.js']);
  assert.equal(parseAIResponse('```file:a.js\n\n```').operations[0].content, '\n');
});
test('AI context excludes secret files and binary data', () => {
  const context = scanProject({
    '.env': 'private',
    'index.html': '<html/>',
    'image.png': 'data:image/png;base64,abc'
  });
  assert.ok(!context.files.some(f => f.path === '.env'));
  assert.ok(!JSON.stringify(context).includes('base64,abc'));
});
test('static preview inlines local stylesheet and script', () => {
  const html = buildStaticPreview({
    'index.html': '<head><link rel="stylesheet" href="a.css"></head><body><script src="a.js"></script></body>',
    'a.css': 'body{color:red}',
    'a.js': 'console.log(42)'
  });
  assert.ok(html.includes('body{color:red}'));
  assert.ok(html.includes('console.log(42)'));
});
test('rate limit expires and malformed context is rejected', () => {
  for (let i = 0; i < 12; i++) assert.equal(enforceLimit('test', 1000), true);
  assert.equal(enforceLimit('test', 1000), false);
  assert.equal(enforceLimit('test', 62000), true);
  assert.throws(() => validateBody({
    projectContext: {
      files: 'bad'
    }
  }));
});
test('OpenAI-only configuration has an explicit model route', () => {
  process.env.AI_FREE_ONLY = 'false';
  process.env.OPENAI_API_KEY = 'test';
  process.env.OPENAI_MODEL = 'explicit-model';
  assert.ok(getModelChain('complex').some(m => m.provider === 'openai' && m.model === 'explicit-model'));
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  delete process.env.AI_FREE_ONLY;
});
test('default free-only mode blocks paid fallback even when a paid key exists', () => {
  process.env.OPENAI_API_KEY='test';process.env.OPENAI_MODEL='paid-model';
  process.env.OPENROUTER_API_KEY='test';
  try {const chain=getModelChain('complex');assert.ok(chain.length);assert.ok(chain.every(m=>m.provider==='ollama'||m.provider==='openrouter'&&(m.model==='openrouter/free'||m.model.endsWith(':free'))));}
  finally {delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;delete process.env.OPENROUTER_API_KEY;}
});
test('guest mode is loopback-only and disabled by default', async () => {
  delete process.env.ALLOW_LOCAL_GUEST;
  await assert.rejects(authorize({
    headers: {},
    socket: {
      remoteAddress: '127.0.0.1'
    }
  }));
  process.env.ALLOW_LOCAL_GUEST = 'true';
  assert.equal(await authorize({
    headers: {},
    socket: {
      remoteAddress: '127.0.0.1'
    }
  }), 'local-developer');
  await assert.rejects(authorize({
    headers: {},
    socket: {
      remoteAddress: '203.0.113.1'
    }
  }));
  delete process.env.ALLOW_LOCAL_GUEST;
});
test('API rejects cross-origin calls and gives a useful missing-key response', async () => {
  function response() {
    return {
      code: 200,
      headers: {},
      status(c) {
        this.code = c;
        return this;
      },
      json(data) {
        this.data = data;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end() {}
    };
  }
  let res = response();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://other.example',
      host: 'localhost:5173',
      'content-type': 'application/json'
    },
    body: {
      message: 'hello'
    }
  }, res);
  assert.equal(res.code, 403);
  process.env.ALLOW_LOCAL_GUEST = 'true';
  res = response();
  await handler({
    method: 'POST',
    socket: {
      remoteAddress: '127.0.0.1'
    },
    headers: {
      'content-type': 'application/json'
    },
    body: {
      message: 'hello'
    }
  }, res);
  assert.equal(res.code, 503);
  assert.equal(res.data.code, 'AI_PROVIDER_NOT_CONFIGURED');
  delete process.env.ALLOW_LOCAL_GUEST;
});
