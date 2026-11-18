# Créditos e origem dos recursos visuais do AXIS

## Símbolo e ícones AXIS
- Símbolo da marca gerado para o projeto: asset gerenciado do projeto Manus em `/manus-storage/async-images/ET6DkIprQc1MTFi7dG9MvI/image-1.webp`.
- Fallback vetorial e favicon mantido no repositório: `public/icons/axis-icon.svg`; ele preserva a identidade e funciona no pacote Termux mesmo se o asset gerenciado não estiver disponível.
- Ícones PWA PNG do Android/iOS foram derivados localmente do mesmo conceito e ficam em `public/icons/`. Não dependem de uma biblioteca de ícones online.

## Fotografia do Diário
- Foto: “Minimalist Open Notebook and Pen on Sunlit Desk”, de Taiye Salawu.
- Página da foto: https://www.pexels.com/photo/minimalist-open-notebook-and-pen-on-sunlit-desk-38041135/
- Licença oficial do Pexels: https://www.pexels.com/license/ — uso gratuito em sites e apps, com edição permitida e crédito não obrigatório; atribuição mantida como cortesia.
- Arquivo no app: `public/images/axis-journal-photo.webp`, otimizado e servido localmente, inclusive no Termux e offline após o precache.

## Tipografia
- **Newsreader Variable** para títulos editoriais; **Atkinson Hyperlegible** para interface e leitura.
- Ambos instalados como dependências fixas em `package.json` e incluídos no build (sem download de fontes em runtime). Licença SIL Open Font License 1.1.
- Projeto Newsreader: https://fonts.google.com/specimen/Newsreader
- Projeto Atkinson Hyperlegible: https://fonts.google.com/specimen/Atkinson+Hyperlegible

## Movimento e acessibilidade
- MDN, recurso `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion — o CSS e a rolagem acionada por navegação respeitam a preferência de movimento reduzido do sistema.
