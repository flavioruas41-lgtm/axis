import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGroqChatCompletion,
  extractAssistantText,
  generateChatReply,
  GROQ_MODEL,
  validateChatPayload,
} from './groq-core.mjs';

const messages = [
  { role: 'user', content: 'Ajude a organizar meu dia.' },
  { role: 'assistant', content: 'Claro. Quais são suas prioridades?' },
  { role: 'user', content: 'Tenho uma reunião às 10h.' },
];

test('valida somente o histórico textual curto do chat', () => {
  assert.deepEqual(validateChatPayload({ messages }), { ok: true, messages });
  assert.equal(validateChatPayload({ messages, tasks: ['não enviar'] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'system', content: 'instrução' }] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'user', content: ' ' }] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'user', content: 'x'.repeat(1601) }] }).ok, false);
  assert.equal(validateChatPayload({ messages: Array(13).fill(messages[0]) }).ok, false);
});

test('monta Chat Completions Groq com a conversa, sem estado ou registros do AXIS', () => {
  const body = buildGroqChatCompletion(messages);
  assert.equal(body.model, 'openai/gpt-oss-20b');
  assert.equal(body.model, GROQ_MODEL);
  assert.deepEqual(body.messages.map((message) => message.role), ['system', 'user', 'assistant', 'user']);
  assert.equal(body.messages[1].content, 'Ajude a organizar meu dia.');
  assert.equal(body.max_completion_tokens, 480);
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(Object.hasOwn(body, 'store'), false);
  assert.equal(Object.hasOwn(body, 'tasks'), false);
  assert.equal(Object.hasOwn(body, 'journal'), false);
  assert.equal(Object.hasOwn(body, 'conversation_id'), false);
});

test('extrai apenas texto da resposta assistant', () => {
  assert.equal(extractAssistantText({ choices: [{ message: { role: 'assistant', content: '  Resposta direta  ' } }] }), 'Resposta direta');
  assert.equal(extractAssistantText({ choices: [{ message: { role: 'user', content: 'não usar' } }] }), '');
  assert.equal(extractAssistantText({ choices: [{ message: { role: 'assistant', content: '' } }] }), '');
});

test('não chama a Groq se a chave server-side estiver ausente', async () => {
  let calls = 0;
  const result = await generateChatReply(messages, {
    apiKey: '',
    fetchImpl: async () => { calls += 1; throw new Error('não deveria executar'); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
});

test('usa uma única chamada Groq e não faz fallback pago quando recebe 429', async () => {
  let calls = 0;
  let sentBody;
  let sentHeaders;
  const result = await generateChatReply(messages, {
    apiKey: 'test-key-only',
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      sentBody = JSON.parse(options.body);
      sentHeaders = options.headers;
      return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'PRIVATE_PROVIDER_TEXT' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(sentBody.model, GROQ_MODEL);
  assert.deepEqual(sentBody.messages.slice(1), messages);
  assert.equal(Object.hasOwn(sentBody, 'store'), false);
  assert.equal(sentHeaders.Authorization, 'Bearer test-key-only');
  assert.equal(result.status, 429);
  assert.match(result.error, /limite gratuito.*não usa fallback pago/i)
  assert.match(result.error, /AXIS-GROQ-HTTP-429/);
});

test('retorna e registra apenas status/código da Groq, nunca mensagem ou chave', async () => {
  const cases = [
    [400, /AXIS-GROQ-HTTP-400/],
    [401, /AXIS-GROQ-HTTP-401/],
    [403, /AXIS-GROQ-HTTP-403/],
    [404, /AXIS-GROQ-HTTP-404/],
    [503, /AXIS-GROQ-HTTP-503/],
  ];
  const logs = [];
  const originalWarn = console.warn;
  console.warn = (...args) => logs.push(args.join(' '));

  try {
    for (const [httpStatus, expectedMessage] of cases) {
      const result = await generateChatReply(messages, {
        apiKey: 'test-key-must-not-be-logged',
        fetchImpl: async () => new Response(JSON.stringify({
          error: { code: 'invalid_request', message: 'PRIVATE_CHAT_TEXT_MUST_NOT_APPEAR' },
        }), {
          status: httpStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      });
      assert.equal(result.ok, false);
      assert.match(result.error, expectedMessage);
      assert.doesNotMatch(result.error, /PRIVATE_CHAT_TEXT_MUST_NOT_APPEAR|test-key-must-not-be-logged/);
    }
  } finally {
    console.warn = originalWarn;
  }

  const allLogs = logs.join('\n');
  assert.match(allLogs, /upstream_http_error/);
  assert.match(allLogs, /"httpStatus":400/);
  assert.match(allLogs, /"providerCode":"invalid_request"/);
  assert.doesNotMatch(allLogs, /PRIVATE_CHAT_TEXT_MUST_NOT_APPEAR|test-key-must-not-be-logged/);
});

test('classifica JSON inválido e resposta sem texto com códigos distintos', async () => {
  const invalidJson = await generateChatReply(messages, {
    apiKey: 'test-key-only',
    fetchImpl: async () => new Response('PRIVATE_RAW_RESPONSE', { status: 200 }),
  });
  assert.equal(invalidJson.ok, false);
  assert.match(invalidJson.error, /AXIS-GROQ-INVALID-RESPONSE/);
  assert.doesNotMatch(invalidJson.error, /PRIVATE_RAW_RESPONSE/);

  const emptyText = await generateChatReply(messages, {
    apiKey: 'test-key-only',
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '' } }] }), { status: 200 }),
  });
  assert.equal(emptyText.ok, false);
  assert.match(emptyText.error, /AXIS-GROQ-EMPTY-RESPONSE/);
});

test('converte somente texto da resposta em objeto mínimo para a interface', async () => {
  let sentBody;
  const result = await generateChatReply(messages, {
    apiKey: 'test-key-only',
    fetchImpl: async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'Organize primeiro a reunião e deixe espaço entre tarefas.' } }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  assert.equal(sentBody.model, GROQ_MODEL);
  assert.deepEqual(result, { ok: true, status: 200, reply: 'Organize primeiro a reunião e deixe espaço entre tarefas.' });
});
