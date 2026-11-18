import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeminiInteraction,
  extractGeminiText,
  generateGeminiReply,
  validateChatPayload,
} from './gemini-core.mjs';

const messages = [
  { role: 'user', content: 'Ajude a organizar meu dia.' },
  { role: 'assistant', content: 'Claro. Quais são suas prioridades?' },
  { role: 'user', content: 'Tenho uma reunião às 10h.' },
];

test('valida exclusivamente o histórico textual curto do chat', () => {
  assert.deepEqual(validateChatPayload({ messages }), { ok: true, messages });
  assert.equal(validateChatPayload({ messages, tasks: ['não enviar'] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'system', content: 'instrução' }] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'user', content: ' ' }] }).ok, false);
  assert.equal(validateChatPayload({ messages: [{ role: 'user', content: 'x'.repeat(1601) }] }).ok, false);
  assert.equal(validateChatPayload({ messages: Array(13).fill(messages[0]) }).ok, false);
});

test('monta uma interação stateless e não anexa registros do AXIS', () => {
  const body = buildGeminiInteraction(messages);
  assert.equal(body.model, 'gemini-3.8-flash');
  assert.equal(body.store, false);
  assert.equal(body.input.length, 3);
  assert.deepEqual(body.input.map((step) => step.type), ['user_input', 'model_output', 'user_input']);
  assert.equal(body.input[0].content[0].text, 'Ajude a organizar meu dia.');
  assert.equal(Object.hasOwn(body, 'tasks'), false);
  assert.equal(Object.hasOwn(body, 'journal'), false);
  assert.equal(body.generation_config.max_output_tokens, 480);
});

test('extrai texto somente de saídas de modelo reconhecidas', () => {
  assert.equal(extractGeminiText({ output_text: '  Resposta direta  ' }), 'Resposta direta');
  assert.equal(extractGeminiText({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Olá' }] }] }), 'Olá');
  assert.equal(extractGeminiText({ steps: [{ type: 'user_input', content: [{ type: 'text', text: 'não repetir' }] }] }), '');
});

test('não chama o Google se o segredo server-side estiver ausente', async () => {
  let calls = 0;
  const result = await generateGeminiReply(messages, {
    apiKey: '',
    fetchImpl: async () => { calls += 1; throw new Error('não deveria executar'); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
});

test('usa uma única chamada Gemini, store:false e não faz fallback ao receber 429', async () => {
  let calls = 0;
  let sentBody;
  let sentHeaders;
  const result = await generateGeminiReply(messages, {
    apiKey: 'test-key-only',
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
      sentBody = JSON.parse(options.body);
      sentHeaders = options.headers;
      return new Response(JSON.stringify({ error: { code: 429 } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(sentBody.store, false);
  assert.equal(sentBody.model, 'gemini-3.8-flash');
  assert.equal(sentHeaders['x-goog-api-key'], 'test-key-only');
  assert.equal(result.status, 429);
  assert.match(result.error, /cota gratuita/i);
});

test('converte a resposta de texto do endpoint em um objeto mínimo para a interface', async () => {
  let sentBody;
  const result = await generateGeminiReply(messages, {
    apiKey: 'test-key-only',
    fetchImpl: async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ output_text: 'Organize primeiro a reunião e deixe espaço entre as tarefas.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  assert.equal(sentBody.store, false);
  assert.deepEqual(result, { ok: true, status: 200, reply: 'Organize primeiro a reunião e deixe espaço entre as tarefas.' });
});
