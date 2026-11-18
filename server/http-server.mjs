import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { createChatHandler } from './chat-endpoint.mjs';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.manifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function withinRoot(root, file) {
  return file === root || file.startsWith(`${root}${sep}`);
}

function sendText(response, status, text, headers = {}) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(text);
}

function sendJson(response, status, value, headers = {}) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function cachePolicy(relativePath) {
  if (['index.html', 'manifest.webmanifest', 'manus-routes.json', 'sw.js'].includes(relativePath)) {
    return 'no-cache';
  }
  if (relativePath.startsWith('assets/') && /-[\w-]{8,}\.(?:js|css|woff2)$/.test(relativePath)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

export function createAxisServer({
  distDir,
  host = '0.0.0.0',
  port = 3000,
  chatOptions,
} = {}) {
  if (!distDir) throw new TypeError('distDir is required');
  const root = resolve(distDir);
  const chatHandler = createChatHandler(chatOptions);

  const server = createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || '/', 'http://axis.local').pathname);
    } catch {
      sendText(response, 400, 'Bad Request', { 'Cache-Control': 'no-store' });
      return;
    }

    if (pathname === '/_app/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { ok: false }, { Allow: 'GET, HEAD' });
        return;
      }
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/api/chat') {
      await chatHandler(request, response);
      return;
    }
    if (pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Esta rota de API não existe.' });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendText(response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }

    let file = resolve(root, `.${pathname}`);
    if (!withinRoot(root, file)) {
      sendText(response, 403, 'Forbidden', { 'Cache-Control': 'no-store' });
      return;
    }

    try {
      const info = await stat(file);
      if (info.isDirectory()) file = resolve(file, 'index.html');
    } catch {
      if (extname(pathname)) {
        sendText(response, 404, 'Not Found', { 'Cache-Control': 'no-store' });
        return;
      }
      file = resolve(root, 'index.html');
    }

    if (!withinRoot(root, file)) {
      sendText(response, 403, 'Forbidden', { 'Cache-Control': 'no-store' });
      return;
    }

    try {
      const info = await stat(file);
      const relativePath = file.slice(root.length + 1);
      response.writeHead(200, {
        'Content-Length': info.size,
        'Content-Type': MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': cachePolicy(relativePath),
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      });
      if (request.method === 'HEAD') {
        response.end();
      } else {
        createReadStream(file).on('error', () => response.destroy()).pipe(response);
      }
    } catch {
      sendText(response, 404, 'Not Found', { 'Cache-Control': 'no-store' });
    }
  });

  server.axisHost = host;
  server.axisPort = port;
  return server;
}
