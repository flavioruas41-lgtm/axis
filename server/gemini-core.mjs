export const GEMINI_MODEL = 'gemini-3.8-flash';
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_MESSAGE_CHARACTERS = 1600;
export const MAX_HISTORY_CHARACTERS = MAX_HISTORY_MESSAGES * MAX_MESSAGE_CHARACTERS;
export const MAX_REPLY_CHARACTERS = 6000;

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const SYSTEM_INSTRUCTION = [
  'Você é o Assistente AXIS, um organizador pessoal acolhedor e prático.',
  'Responda em português brasileiro com clareza e concisão.',
  'Você só conhece o conteúdo desta conversa: não tem acesso a tarefas, objetivos, projetos, hábitos, Estudos, Diário, finanças ou outros dados do AXIS.',
  'Não afirme que consultou ou alterou registros, criou tarefas, enviou lembretes ou acessou informações externas.',
  'Dê sugestões realistas, faça perguntas quando faltarem detalhes e não se apresente como profissional médico, jurídico ou financeiro.',
].join(' ');

const ERROR_MESSAGES = {
  missingKey: 'O chat ainda não foi configurado no servidor. Tente novamente mais tarde.',
  network: 'Não foi possível conectar ao Gemini. Verifique a conexão e tente novamente (AXIS-GEMINI-NETWORK).',
  timeout: 'O Gemini demorou para responder. Tente novamente em instantes (AXIS-GEMINI-TIMEOUT).',
  quota: 'A cota gratuita do Gemini foi atingida ou está temporariamente ocupada. Aguarde e tente novamente.',
  credentials: 'A chave Gemini configurada no servidor foi recusada. Verifique a configuração da chave.',
  provider: 'O Gemini retornou uma resposta em formato inesperado (AXIS-GEMINI-INVALID-RESPONSE).',
  empty: 'O Gemini retornou uma resposta sem texto (AXIS-GEMINI-EMPTY-RESPONSE).',
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

export function buildGeminiInteraction(messages) {
  return {
    model: GEMINI_MODEL,
    input: messages.map((message) => ({
      type: message.role === 'assistant' ? 'model_output' : 'user_input',
      content: [{ type: 'text', text: message.content }],
    })),
    system_instruction: SYSTEM_INSTRUCTION,
    generation_config: {
      max_output_tokens: 480,
      thinking_level: 'low',
    },
    store: false,
  };
}

export function extractGeminiText(interaction) {
  if (typeof interaction?.output_text === 'string' && interaction.output_text.trim()) {
    return interaction.output_text.trim().slice(0, MAX_REPLY_CHARACTERS);
  }

  const steps = Array.isArray(interaction?.steps) ? interaction.steps : [];
  const textFromSteps = steps
    .filter((step) => step?.type === 'model_output' && Array.isArray(step.content))
    .flatMap((step) => step.content)
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
  if (textFromSteps) return textFromSteps.slice(0, MAX_REPLY_CHARACTERS);

  const candidates = interaction?.candidates;
  if (Array.isArray(candidates)) {
    const fallback = candidates
      .flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
      .filter((part) => typeof part?.text === 'string')
      .map((part) => part.text)
      .join('')
      .trim();
    if (fallback) return fallback.slice(0, MAX_REPLY_CHARACTERS);
  }

  return '';
}

function publicProviderError(status) {
  const diagnosticCode = `AXIS-GEMINI-HTTP-${status}`;
  if (status === 401) {
    return { status: 503, error: `${ERROR_MESSAGES.credentials} (HTTP 401; ${diagnosticCode})` };
  }
  if (status === 403) {
    return {
      status: 503,
      error: `O Google negou acesso à Gemini API (HTTP 403; ${diagnosticCode}). Confira o estado da chave e a elegibilidade do projeto para a faixa gratuita.`,
    };
  }
  if (status === 429) {
    return { status: 429, error: `${ERROR_MESSAGES.quota} (HTTP 429; ${diagnosticCode})` };
  }
  if (status === 400 || status === 422) {
    return { status: 422, error: `O Google rejeitou a solicitação Gemini (HTTP ${status}; ${diagnosticCode}).` };
  }
  if (status === 404) {
    return { status: 502, error: `O Google não encontrou o endpoint ou modelo solicitado (HTTP 404; ${diagnosticCode}).` };
  }
  if (status >= 500) {
    return { status: 502, error: `O Gemini teve uma falha temporária (HTTP ${status}; ${diagnosticCode}).` };
  }
  return { status: 502, error: `O Gemini retornou um erro HTTP ${status} (${diagnosticCode}).` };
}

export async function generateGeminiReply(messages, {
  apiKey = process.env.AXIS_GEMINI_API_KEY,
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
    response = await fetchImpl(INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiInteraction(messages)),
      ...(requestSignal ? { signal: requestSignal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) return { ok: false, status: 499, error: 'O envio foi cancelado.' };
    if (timeoutSignal?.aborted) {
      console.warn('[AXIS Gemini] timeout', JSON.stringify({ timeoutMs: 45_000 }));
      return { ok: false, status: 504, error: ERROR_MESSAGES.timeout };
    }
    const errorName = error instanceof Error && /^[A-Za-z]+Error$/.test(error.name) ? error.name : 'NetworkError';
    console.warn('[AXIS Gemini] network_failure', JSON.stringify({ errorName }));
    return { ok: false, status: 502, error: ERROR_MESSAGES.network };
  }

  if (!response.ok) {
    let providerCode;
    try {
      const details = await response.clone().json();
      const candidate = details?.error?.status;
      if (typeof candidate === 'string' && /^[A-Z0-9_]{1,48}$/.test(candidate)) providerCode = candidate;
    } catch {
      // Keep provider details private; the HTTP status is enough for diagnosis.
    }
    console.warn('[AXIS Gemini] upstream_http_error', JSON.stringify({
      httpStatus: response.status,
      ...(providerCode ? { providerCode } : {}),
    }));
    return { ok: false, ...publicProviderError(response.status) };
  }

  let interaction;
  try {
    interaction = await response.json();
  } catch {
    console.warn('[AXIS Gemini] invalid_json_response', JSON.stringify({ httpStatus: response.status }));
    return { ok: false, status: 502, error: ERROR_MESSAGES.provider };
  }

  const reply = extractGeminiText(interaction);
  if (!reply) {
    console.warn('[AXIS Gemini] empty_text_response', JSON.stringify({ httpStatus: response.status }));
    return { ok: false, status: 502, error: ERROR_MESSAGES.empty };
  }
  return { ok: true, status: 200, reply };
}
