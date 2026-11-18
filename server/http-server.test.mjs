import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createAxisServer } from './http-server.mjs';

 test('servidor híbrido oferece health, frontend e API com cabeçalhos próprios', async (t) => {
  const distDir = await mkdtemp(join(tmpdir(), 'axis-http-test-'));
  await writeFile(resolve(distDir, 'index.html'), '<!doctype html><html><body><div id="root"></div></body></html>');
  t.after(() => rm(distDir, { recursive: true, force: true }));

  let providerCalls = 0;
  const server = createAxisServer({
    distDir,
    host: '127.0.0.1',
    port: 0,
    chatOptions: {
      getApiKey: () => 'test-only-not-a-real-key',
      fetchImpl: async () => { providerCalls += 1; throw new Error('o teste não pode chamar o provedor'); },
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((done) => server.close(done));
  });

  const origin = `http://127.0.0.1:${address.port}`;

  const healthResponse = await fetch(`${origin}/_app/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { ok: true });
  assert.equal(healthResponse.headers.get('cache-control'), 'no-store, max-age=0');

  const staticResponse = await fetch(origin);
  assert.equal(staticResponse.status, 200);
  assert.match(await staticResponse.text(), /<div id="root"><\/div>/);
  assert.equal(staticResponse.headers.get('cache-control'), 'no-cache');

  const apiResponse = await fetch(`${origin}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const apiBody = await apiResponse.json();
  assert.equal(apiResponse.status, 400);
  assert.equal(apiResponse.headers.get('cache-control'), 'no-store, max-age=0');
  assert.match(apiBody.error, /histórico/i);
  assert.equal(providerCalls, 0);
});
