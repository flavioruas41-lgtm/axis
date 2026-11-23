export const GROQ_MODEL = 'openai/gpt-oss-20b';
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_MESSAGE_CHARACTERS = 1600;
export const MAX_HISTORY_CHARACTERS = MAX_HISTORY_MESSAGES * MAX_MESSAGE_CHARACTERS;
export const MAX_REPLY_CHARACTERS = 6000;

const CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_INSTRUCTION = [
  'Você é o Assistente AXIS, um organizador pessoal acolhedor e prático.',
  'Responda em português brasileiro com clareza e concisão.',
  'Você só conhece o conteúdo desta conversa: não tem acesso a tarefas, objetivos, projetos, hábitos, estudos, diário, finanças ou outros dados do AXIS.',
  'Não afirme que consultou ou alterou registros, criou tarefas, enviou lembretes ou acessou informações externas.',
  'Dê sugestões realistas, faça perguntas quando faltarem detalhes e não se apresente como profissional médico, jurídico ou financeiro.',
].join(' ');

const ERROR_MESSAGES = {
  missingKey: 'O chat ainda não foi configurado no servidor. Tente novamente mais tarde.',
  network: 'Não foi possível conectar à Groq. Verifique a conexão e tente novamente (AXIS-GROQ-NETWORK).',
  timeout: 'A Groq demorou para responder. Tente novamente em instantes (AXIS-GROQ-TIMEOUT).',
  quota: 'O limite gratuito ou de uso da sua conta Groq foi atingido. Aguarde e tente novamente; o AXIS não usa fallback pago.',
  credentials: 'A chave Groq configurada no servidor foi recusada.',
  provider: 'A Groq retornou uma resposta em formato inesperado (AXIS-GROQ-INVALID-RESPONSE).',
  empty: 'A Groq retornou uma resposta sem texto (AXIS-GROQ-EMPTY-RESPONSE).',
};

export function validateChatMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_HISTORY_MESSAGES) {
    return { ok: false, status: 400, error: `Envie entre 1 e ${MAX_HISTORY_MESSAGES} mensagens recentes.` };
  }

  let totalCharacters = 0;
  const messages = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, status: 400, error: 'O formato da conversa é inválido.' };
    }

    const keys = Object.keys(item);
    if (keys.length !== 2 || !keys.includes('role') || !keys.includes('content')) {
      return { ok: false, status: 400, error: 'A conversa pode conter apenas texto e papel de mensagem.' };
    }

    if (item.role !== 'user' && item.role !== 'assistant') {
      return { ok: false, status: 400, error: 'O formato da conversa é inválido.' };
    }

    if (typeof item.content !== 'string') {
      return { ok: false, status: 400, error: 'As mensagens precisam ser texto.' };
    }

    const content = item.content.trim();
    if (!content || content.length > MAX_MESSAGE_CHARACTERS) {
      return { ok: false, status: 400, error: `Cada mensagem deve ter de 1 a ${MAX_MESSAGE_CHARACTERS} caracteres.` };
    }

    totalCharacters += content.length;
    if (totalCharacters > MAX_HISTORY_CHARACTERS) {
      return { ok: false, status: 400, error: 'A conversa está longa demais. Limpe-a e tente novamente.' };
    }
    messages.push({ role: item.role, content });
  }

  if (messages[messages.length - 1].role !== 'user') {
    return { ok: false, status: 400, error: 'A última mensagem precisa ser sua.' };
  }

  return { ok: true, messages };
}

export function validateChatPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, status: 400, error: 'O pedido de chat é inválido.' };
  }

  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'messages') {
    return { ok: false, status: 400, error: 'O chat aceita somente o histórico da conversa.' };
  }

  return validateChatMessages(payload.messages);
}

export function buildGroqChatCompletion(messages) {
  return {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      ...messages.map(({ role, content }) => ({ role, content })),
    ],
    max_completion_tokens: 480,
    reasoning_effort: 'low',
    temperature: 0.4,
  };
}

export function extractAssistantText(completion) {
  const message = completion?.choices?.[0]?.message;
  if (message?.role !== 'assistant') return '';
  const content = message.content;
  if (typeof content !== 'string' || !content.trim()) return '';
  return content.trim().slice(0, MAX_REPLY_CHARACTERS);
}

function publicProviderError(status) {
  const diagnosticCode = `AXIS-GROQ-HTTP-${status}`;
  if (status === 401) {
    return { status: 503, error: `${ERROR_MESSAGES.credentials} (HTTP 401; ${diagnosticCode})` };
  }
  if (status === 403) {
    return {
      status: 503,
      error: `A Groq negou acesso à API ou ao modelo (HTTP 403; ${diagnosticCode}).`,
    };
  }
  if (status === 429) {
    return { status: 429, error: `${ERROR_MESSAGES.quota} (HTTP 429; ${diagnosticCode})` };
  }
  if (status === 400 || status === 422) {
    return { status: 422, error: `A Groq rejeitou a solicitação (HTTP ${status}; ${diagnosticCode}).` };
  }
  if (status === 404) {
    return { status: 502, error: `A Groq não encontrou o endpoint ou modelo (HTTP 404; ${diagnosticCode}).` };
  }
  if (status >= 500) {
    return { status: 502, error: `A Groq teve uma falha temporária (HTTP ${status}; ${diagnosticCode}).` };
  }
  return { status: 502, error: `A Groq retornou um erro HTTP ${status} (${diagnosticCode}).` };
}

export async function generateChatReply(messages, {
  apiKey = process.env.GROQ_API_KEY,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { ok: false, status: 503, error: ERROR_MESSAGES.missingKey };
  }
  if (typeof fetchImpl !== 'function') {
    return { ok: false, status: 503, error: ERROR_MESSAGES.network };
  }

  let timeoutSignal;
  try {
    timeoutSignal = AbortSignal.timeout(45_000);
  } catch {
    timeoutSignal = undefined;
  }

  let requestSignal = signal;
  if (signal && timeoutSignal && typeof AbortSignal.any === 'function') {
    requestSignal = AbortSignal.any([signal, timeoutSignal]);
  } else if (timeoutSignal) {
    requestSignal = timeoutSignal;
  }

  let response;
  try {
    response = await fetchImpl(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildGroqChatCompletion(messages)),
      ...(requestSignal ? { signal: requestSignal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) return { ok: false, status: 499, error: 'O envio foi cancelado.' };
    if (timeoutSignal?.aborted) {
      console.warn('[AXIS Groq] timeout', JSON.stringify({ timeoutMs: 45_000 }));
      return { ok: false, status: 504, error: ERROR_MESSAGES.timeout };
    }
    const errorName = error instanceof Error && /^[A-Za-z]+Error$/.test(error.name) ? error.name : 'NetworkError';
    console.warn('[AXIS Groq] network_failure', JSON.stringify({ errorName }));
    return { ok: false, status: 502, error: ERROR_MESSAGES.network };
  }

  if (!response.ok) {
    let providerCode;
    try {
      const details = await response.clone().json();
      const candidate = details?.error?.code ?? details?.error?.type;
      if (typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(candidate)) providerCode = candidate;
    } catch {
      // Keep provider details private; the HTTP status is enough for diagnosis.
    }
    console.warn('[AXIS Groq] upstream_http_error', JSON.stringify({
      httpStatus: response.status,
      ...(providerCode ? { providerCode } : {}),
    }));
    return { ok: false, ...publicProviderError(response.status) };
  }

  let completion;
  try {
    completion = await response.json();
  } catch {
    console.warn('[AXIS Groq] invalid_json_response', JSON.stringify({ httpStatus: response.status }));
    return { ok: false, status: 502, error: ERROR_MESSAGES.provider };
  }

  const reply = extractAssistantText(completion);
  if (!reply) {
    console.warn('[AXIS Groq] empty_text_response', JSON.stringify({ httpStatus: response.status }));
    return { ok: false, status: 502, error: ERROR_MESSAGES.empty };
  }
  return { ok: true, status: 200, reply };
}
