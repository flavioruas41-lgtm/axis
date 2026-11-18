import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-400.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-700.css';
import './styles.css';
import './interaction.css';

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.warn('O service worker do AXIS não pôde ser registrado.', error);
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
