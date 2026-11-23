import { generateChatReply, validateChatPayload } from './groq-core.mjs';

const MAX_BODY_BYTES = 64 * 1024;
export const RATE_WINDOW_MS = 60_000;
export const RATE_DAY_MS = 24 * 60 * 60_000;
export const MAX_REQUESTS_PER_IP_PER_WINDOW = 8;
export const MAX_TOTAL_REQUESTS_PER_WINDOW = 40;
export const MAX_TOTAL_REQUESTS_PER_DAY = 120;
const MAX_RATE_LIMIT_BUCKETS = 2048;

function sendJson(response, status, payload, extraHeaders = {}) {
  if (response.destroyed || response.writableEnded || response.headersSent) return;
  response.removeHeader('Cache-Control');
  response.writeHead(status, {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const contentType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return { ok: false, status: 415, error: 'O chat aceita apenas mensagens em JSON.' };
  }

  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    request.resume();
    return { ok: false, status: 413, error: 'A conversa está longa demais. Limpe-a e tente novamente.' };
  }

  const chunks = [];
  let bytes = 0;
  let tooLarge = false;

  try {
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        tooLarge = true;
        continue;
      }
      if (!tooLarge) chunks.push(buffer);
    }
  } catch {
    return { ok: false, status: 400, error: 'O pedido de chat foi interrompido. Tente novamente.' };
  }

  if (tooLarge) return { ok: false, status: 413, error: 'A conversa está longa demais. Limpe-a e tente novamente.' };

  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return { ok: false, status: 400, error: 'Não foi possível ler o pedido de chat.' };
  }
  return { ok: true, payload };
}

function isUntrustedOrigin(request) {
  const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin') return true;

  const originHeader = request.headers.origin;
  if (!originHeader) return false;

  try {
    const origin = new URL(originHeader);
    if (!['http:', 'https:'].includes(origin.protocol)) return true;

    // Browser Fetch Metadata survives ingress that may rebase Host to an internal listener.
    if (fetchSite === 'same-origin') return false;

    const requestHost = String(request.headers.host || '').toLowerCase();
    return !requestHost || origin.host.toLowerCase() !== requestHost;
  } catch {
    return true;
  }
}

export function createRateLimiter({
  windowMs = RATE_WINDOW_MS,
  dayMs = RATE_DAY_MS,
  maxRequestsPerIp = MAX_REQUESTS_PER_IP_PER_WINDOW,
  maxRequestsPerWindow = MAX_TOTAL_REQUESTS_PER_WINDOW,
  maxRequestsPerDay = MAX_TOTAL_REQUESTS_PER_DAY,
  maxBuckets = MAX_RATE_LIMIT_BUCKETS,
} = {}) {
  const buckets = new Map();
  let windowStartedAt = null;
  let windowCount = 0;
  let dayStartedAt = null;
  let dayCount = 0;

  return function takeRateLimit(request, now = Date.now()) {
    if (windowStartedAt === null || now - windowStartedAt >= windowMs) {
      windowStartedAt = now;
      windowCount = 0;
    }
    if (dayStartedAt === null || now - dayStartedAt >= dayMs) {
      dayStartedAt = now;
      dayCount = 0;
    }

    if (dayCount >= maxRequestsPerDay) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((dayMs - (now - dayStartedAt)) / 1000)),
        error: 'O limite diário de segurança do chat foi atingido. Tente novamente mais tarde.',
      };
    }
    if (windowCount >= maxRequestsPerWindow) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((windowMs - (now - windowStartedAt)) / 1000)),
        error: 'O chat está recebendo muitas mensagens. Aguarde um minuto e tente novamente.',
      };
    }

    const identity = request.socket?.remoteAddress || 'unknown';
    let bucket = buckets.get(identity);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      if (buckets.size >= maxBuckets) {
        for (const [key, value] of buckets) {
          if (now - value.startedAt >= windowMs) buckets.delete(key);
        }
      }
      if (buckets.size >= maxBuckets) {
        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
          error: 'O chat está recebendo muitas mensagens. Aguarde um minuto e tente novamente.',
        };
      }
      bucket = { startedAt: now, count: 0 };
      buckets.set(identity, bucket);
    }

    if (bucket.count >= maxRequestsPerIp) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((windowMs - (now - bucket.startedAt)) / 1000)),
        error: 'Você enviou mensagens muito rápido. Aguarde um minuto e tente novamente.',
      };
    }

    bucket.count += 1;
    windowCount += 1;
    dayCount += 1;
    return { allowed: true };
  };
}

export function createChatHandler({
  getApiKey = () => process.env.GROQ_API_KEY,
  fetchImpl = globalThis.fetch,
  rateLimiter = createRateLimiter(),
} = {}) {
  return async function chatHandler(request, response) {
    if (response.destroyed || response.writableEnded) return;
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Use POST para enviar uma mensagem.' }, { Allow: 'POST' });
      return;
    }

    if (isUntrustedOrigin(request)) {
      request.resume();
      sendJson(response, 403, { error: 'O chat só aceita solicitações originadas pelo próprio AXIS.' });
      return;
    }

    const body = await readJsonBody(request);
    if (!body.ok) {
      if (!response.destroyed) sendJson(response, body.status, { error: body.error });
      return;
    }

    const validated = validateChatPayload(body.payload);
    if (!validated.ok) {
      sendJson(response, validated.status, { error: validated.error });
      return;
    }

    const rate = rateLimiter(request);
    if (!rate.allowed) {
      sendJson(response, 429, { error: rate.error }, { 'Retry-After': String(rate.retryAfter) });
      return;
    }

    const controller = new AbortController();
    const abortWhenClientLeaves = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.on('close', abortWhenClientLeaves);

    try {
      const result = await generateChatReply(validated.messages, {
        apiKey: getApiKey(),
        fetchImpl,
        signal: controller.signal,
      });
      if (response.destroyed || response.writableEnded) return;
      if (result.ok) {
        sendJson(response, 200, { reply: result.reply });
      } else if (result.status === 429) {
        sendJson(response, 429, { error: result.error }, { 'Retry-After': '60' });
      } else {
        sendJson(response, result.status, { error: result.error });
      }
    } catch {
      if (!response.destroyed && !response.writableEnded) {
        sendJson(response, 502, { error: 'A Groq não conseguiu responder agora. Tente novamente depois.' });
      }
    } finally {
      response.off('close', abortWhenClientLeaves);
    }
  };
}

export { MAX_BODY_BYTES };
