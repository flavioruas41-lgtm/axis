import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAxisServer } from './server/http-server.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const distDir = resolve(projectRoot, 'dist');
const parsedPort = Number(process.env.AXIS_PORT || 3000);
const port = Number.isInteger(parsedPort) && parsedPort >= 1024 && parsedPort <= 65535
  ? parsedPort
  : 3000;
const host = '127.0.0.1';
const server = createAxisServer({ distDir, host, port });

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`A porta ${port} já está em uso. Tente AXIS_PORT=3001 node serve-termux.mjs.`);
  } else {
    console.error(`O servidor do AXIS não pôde ser iniciado (${error?.code || 'erro local'}).`);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`AXIS pronto em http://127.0.0.1:${port}`);
  console.log('O chat opcional usa GROQ_API_KEY somente no ambiente do Termux; use uma conta Groq Free sem faturamento habilitado.');
  console.log('Mantenha o Termux aberto enquanto usa o servidor. Pare com Ctrl+C.');
});
