import { createChatHandler } from '../server/chat-endpoint.mjs';

function readHeader(headers, name) {
  const value = headers?.[name];
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
}

function adaptVercelRequest(request) {
  let parsedBody;
  let hasParsedBody = false;

  try {
    if ('body' in request) {
      parsedBody = request.body;
      hasParsedBody = parsedBody !== undefined;
    }
  } catch {
    // A malformed JSON body can throw when Vercel exposes its parsed-body helper.
    parsedBody = null;
    hasParsedBody = true;
  }

  if (!hasParsedBody) return request;

  let bodyText;
  try {
    const serialized = JSON.stringify(parsedBody);
    bodyText = typeof serialized === 'string' ? serialized : 'null';
  } catch {
    bodyText = 'null';
  }

  const bodyBuffer = Buffer.from(bodyText);
  const headers = { ...(request.headers || {}) };
  const declaredLength = Number(headers['content-length']);
  const contentLength = Number.isFinite(declaredLength) && declaredLength >= 0
    ? Math.max(declaredLength, bodyBuffer.byteLength)
    : bodyBuffer.byteLength;
  headers['content-length'] = String(contentLength);

  // Vercel overwrites x-forwarded-for with the public client IP; use it for
  // the existing best-effort per-IP limiter instead of an internal socket IP.
  const forwardedIp = readHeader(headers, 'x-forwarded-for').split(',')[0].trim();
  const realIp = readHeader(headers, 'x-real-ip').trim();
  const remoteAddress = forwardedIp || realIp || request.socket?.remoteAddress || 'unknown';

  return {
    method: request.method,
    headers,
    socket: { remoteAddress },
    resume() {},
    async *[Symbol.asyncIterator]() {
      yield bodyBuffer;
    },
  };
}

export function createVercelChatHandler(options) {
  const handleChat = createChatHandler(options);
  return function chat(request, response) {
    return handleChat(adaptVercelRequest(request), response);
  };
}

export default createVercelChatHandler();
