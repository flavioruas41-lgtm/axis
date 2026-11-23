import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createChatHandler, createRateLimiter } from './chat-endpoint.mjs';

const validMessages = [
  { role: 'user', content: 'Ajude a organizar meu dia.' },
];

async function withChatServer(options, run) {
  const server = createServer(createChatHandler(options));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

function successfulFetch(calls) {
  return async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Separe primeiro o que tem horário marcado.' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

test('POST válido envia apenas histórico textual à Groq e responde sem cache', async () => {
  const calls = [];
  await withChatServer({ getApiKey: () => 'test-only-not-a-real-key', fetchImpl: successfulFetch(calls) }, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: validMessages }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.equal(data.reply, 'Separe primeiro o que tem horário marcado.');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.model, 'openai/gpt-oss-20b');
    assert.equal(Object.hasOwn(calls[0].body, 'store'), false);
    assert.equal(calls[0].body.messages[0].role, 'system');
    assert.deepEqual(calls[0].body.messages[1], validMessages[0]);
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only-not-a-real-key');
    assert.equal(Object.hasOwn(calls[0].body, 'tasks'), false);
  });
});

test('GET e origem cross-site são recusados antes da chamada ao provedor', async () => {
  const calls = [];
  await withChatServer({ getApiKey: () => 'test-only-not-a-real-key', fetchImpl: successfulFetch(calls) }, async (origin) => {
    const methodResponse = await fetch(`${origin}/api/chat`);
    assert.equal(methodResponse.status, 405);
    assert.equal(methodResponse.headers.get('allow'), 'POST');

    const crossSiteResponse = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify({ messages: validMessages }),
    });
    assert.equal(crossSiteResponse.status, 403);
    assert.equal(calls.length, 0);
  });
});

test('Origin incompatível é recusado antes da chamada ao provedor', async () => {
  const calls = [];
  await withChatServer({ getApiKey: () => 'test-only-not-a-real-key', fetchImpl: successfulFetch(calls) }, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ messages: validMessages }),
    });
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  });
});

test('fetch same-origin do navegador funciona quando o proxy rebaseia Host para o listener interno', async () => {
  const calls = [];
  await withChatServer({ getApiKey: () => 'test-only-not-a-real-key', fetchImpl: successfulFetch(calls) }, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'same-origin',
        Origin: 'https://axislife-m86agbfw.manus.space',
      },
      body: JSON.stringify({ messages: validMessages }),
    });

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
  });
});

test('payload com registros locais adicionais ou corpo acima do limite não segue à Groq', async () => {
  const calls = [];
  await withChatServer({ getApiKey: () => 'test-only-not-a-real-key', fetchImpl: successfulFetch(calls) }, async (origin) => {
    const pollutedResponse = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: validMessages, tasks: [{ title: 'privado' }] }),
    });
    assert.equal(pollutedResponse.status, 400);

    const oversizedResponse = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(66_000) }] }),
    });
    assert.equal(oversizedResponse.status, 413);
    assert.equal(calls.length, 0);
  });
});

test('segredo ausente não chama o provedor e devolve erro sem dados internos', async () => {
  let calls = 0;
  await withChatServer({ getApiKey: () => '', fetchImpl: async () => { calls += 1; throw new Error('não deve chamar'); } }, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: validMessages }),
    });
    const data = await response.json();

    assert.equal(response.status, 503);
    assert.match(data.error, /não foi configurado/i);
    assert.equal(calls, 0);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
  });
});

test('HTTP 429 da Groq vira orientação de limite e não faz fallback pago', async () => {
  let calls = 0;
  await withChatServer({
    getApiKey: () => 'test-only-not-a-real-key',
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal(JSON.parse(options.body).model, 'openai/gpt-oss-20b');
      assert.equal(Object.hasOwn(JSON.parse(options.body), 'store'), false);
      return new Response(JSON.stringify({ error: { code: 429 } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  }, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: validMessages }),
    });
    const data = await response.json();

    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
    assert.match(data.error, /temporariamente indisponível/i);
    assert.equal(calls, 1);
  });
});

test('erro upstream mostra status seguro sem expor a mensagem bruta da Groq', async () => {
  const privateProviderText = 'DETAIL_MUST_NOT_REACH_THE_CHAT';
  await withChatServer({
    getApiKey: () => 'test-only-not-a-real-key',
    fetchImpl: async () => new Response(JSON.stringify({
      error: { status: 'INVALID_ARGUMENT', message: privateProviderText },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }),
  }, async (origin) => {
    const response = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: validMessages }),
    });
    const data = await response.json();

    assert.equal(response.status, 422);
    assert.match(data.error, /Não foi possível processar a mensagem/);
    assert.doesNotMatch(data.error, new RegExp(privateProviderText));
  });
});

test('limiter process-local limita por IP, agregado por minuto e volume diário', () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    dayMs: 86_400_000,
    maxRequestsPerIp: 2,
    maxRequestsPerWindow: 3,
    maxRequestsPerDay: 4,
  });
  const request = (ip) => ({ socket: { remoteAddress: ip } });

  assert.equal(limiter(request('ip-a'), 0).allowed, true);
  assert.equal(limiter(request('ip-a'), 1).allowed, true);
  assert.equal(limiter(request('ip-a'), 2).allowed, false);
  assert.equal(limiter(request('ip-b'), 3).allowed, true);
  assert.equal(limiter(request('ip-c'), 4).allowed, false);
  assert.equal(limiter(request('ip-c'), 60_001).allowed, true);
  const dailyLimit = limiter(request('ip-d'), 60_002);
  assert.equal(dailyLimit.allowed, false);
  assert.match(dailyLimit.error, /limite diário/i);
});
