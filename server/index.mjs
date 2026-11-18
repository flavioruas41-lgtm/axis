import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAxisServer } from './http-server.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = resolve(projectRoot, 'dist');
const parsedPort = Number(process.env.PORT || 3000);
const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536 ? parsedPort : 3000;
const server = createAxisServer({ distDir, host: '0.0.0.0', port });

server.on('error', () => {
  console.error('O servidor do AXIS não pôde ser iniciado.');
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor do AXIS iniciado na porta ${port}.`);
});
