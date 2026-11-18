import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const outputDirectory = resolve('dist');
const assetDirectory = join(outputDirectory, 'assets');
const serviceWorkerPath = join(outputDirectory, 'sw.js');
const assets = (await readdir(assetDirectory))
  .filter((name) => /\.(?:js|css|woff2?|ttf|otf)$/.test(name))
  .sort()
  .map((name) => `/assets/${name}`);

if (!assets.some((asset) => asset.endsWith('.js'))) {
  throw new Error('Nenhum bundle JavaScript encontrado para o precache do AXIS.');
}

const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
const marker = 'const BUILD_ASSETS = [];';
if (!serviceWorker.includes(marker)) {
  throw new Error('Marcador BUILD_ASSETS ausente no service worker copiado para dist.');
}

await writeFile(serviceWorkerPath, serviceWorker.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(assets)};`));
console.log(`Precache offline AXIS: ${assets.length} bundles incluídos no service worker.`);
