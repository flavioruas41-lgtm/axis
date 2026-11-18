import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createVercelChatHandler } from '../api/chat.js';
import { createRateLimiter } from './chat-endpoint.mjs';

const validMessages = [{ role: 'user', content: 'Ajude a organizar meu dia.' }];

async function withVercelLikeServer(handler, run) {
  const server = createServer(async (request, response) => {
    if (request.headers['content-type'] === 'application/json') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      try {
        request.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        request.body = null;
      }
    }
    await handler(request, response);
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    await run(origin);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

function sameOriginHeaders(origin, clientIp = '192.0.2.10') {
  return {
    'Content-Type': 'application/json',
    Origin: origin,
    'Sec-Fetch-Site': 'same-origin',
    'X-Forwarded-For': clientIp,
  };
}

function mockedGemini(calls) {
  return async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    calls.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ output_text: 'Resposta local simulada.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

test('adapta o JSON da Vercel, usa Gemini stateless e mantém resposta no-store', async () => {
  const calls = [];
  const handler = createVercelChatHandler({
    getApiKey: () => 'not-a-real-test-key',
    fetchImpl: mockedGemini(calls),
  });

  await withVercelLikeServer(handler, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: sameOriginHeaders(origin),
      body: JSON.stringify({ messages: validMessages }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.equal(data.reply, 'Resposta local simulada.');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].store, false);
    assert.equal(calls[0].model, 'gemini-3.8-flash');
    assert.equal(calls[0].input[0].content[0].text, validMessages[0].content);
    assert.equal(Object.hasOwn(calls[0], 'tasks'), false);
  });
});

test('mapeia o IP público encaminhado pela Vercel para o limite por IP', async () => {
  const calls = [];
  const handler = createVercelChatHandler({
    getApiKey: () => 'not-a-real-test-key',
    fetchImpl: mockedGemini(calls),
    rateLimiter: createRateLimiter({ maxRequestsPerIp: 1, maxRequestsPerWindow: 10, maxRequestsPerDay: 10 }),
  });

  await withVercelLikeServer(handler, async (origin) => {
    const send = (clientIp) => fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: sameOriginHeaders(origin, clientIp),
      body: JSON.stringify({ messages: validMessages }),
    });

    assert.equal((await send('192.0.2.10')).status, 200);
    assert.equal((await send('192.0.2.10')).status, 429);
    assert.equal((await send('192.0.2.11')).status, 200);
    assert.equal(calls.length, 2);
  });
});

test('recusa origem cross-site, payload inválido e corpo grande sem chamar Gemini', async () => {
  const calls = [];
  const handler = createVercelChatHandler({
    getApiKey: () => 'not-a-real-test-key',
    fetchImpl: mockedGemini(calls),
  });

  await withVercelLikeServer(handler, async (origin) => {
    const crossSite = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: {
        ...sameOriginHeaders(origin),
        Origin: 'https://evil.example',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({ messages: validMessages }),
    });
    assert.equal(crossSite.status, 403);

    const invalid = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: sameOriginHeaders(origin),
      body: '{}',
    });
    assert.equal(invalid.status, 400);

    const oversized = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: sameOriginHeaders(origin),
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(70_000) }] }),
    });
    assert.equal(oversized.status, 413);
    assert.equal(calls.length, 0);
  });
});
