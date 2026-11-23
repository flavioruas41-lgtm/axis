# Plano — AXIS

## Objetivo e decisões aprovadas

O assistente do AXIS usa Groq com `openai/gpt-oss-20b`, somente em uma organização Free sem faturamento, sem fallback para outro provedor. A API não deve ser chamada em testes automatizados.

Os registros do organizador permanecem no armazenamento local do navegador. O chat envia apenas o histórico curto que a pessoa escreve expressamente; não anexa tarefas, objetivos, projetos, hábitos, estudos, Diário, finanças ou backups. O consentimento precisa dizer com clareza que as mensagens do chat são processadas por um serviço externo e apresentar os limites de retenção divulgados pelo provedor. A interface principal não exibe nomes de modelo nem etiquetas de quota.

## Arquitetura de aplicação

A UI permanece em `src/components/ChatAssistant.tsx` e no shell de `src/App.tsx`; mensagens ficam em estado React e são apagadas ao recarregar. `server/groq-core.mjs` valida o histórico curto e chama Chat Completions; a chave fica apenas no servidor, sem ser exposta no bundle ou nos logs. `server/chat-endpoint.mjs` limita método, origem, tamanho e histórico; não há fallback.

`server/index.mjs`, `api/chat.js` e `vite.config.ts` atendem, respectivamente, Termux, Vercel e Preview local. `src/storage.ts` persiste os registros do organizador no navegador, com ferramentas de backup/restauração.

## Identidade visual e interação

Evoluir a direção editorial orgânica já existente para uma identidade mais viva, calorosa e fácil de reconhecer, sem sacrificar legibilidade ou criar um visual genérico de IA.

- **Princípios:** personalidade com contenção; ações e progresso fáceis de perceber; privacidade expressa em linguagem simples; movimento curto, útil e acessível.
- **Cores:** manter a base verde-profunda e superfícies discretas, acrescentando cítrico luminoso, laranja-sol/coral e azul-claro em pontos de foco para diferenciar estados sem saturar a tela.
- **Layout:** preservar a navegação e os painéis familiares do organizador; transformar o banner inicial em ponto focal com a imagem de marca e espaço respirado; aplicar acentos variados a métricas e ações rápidas.
- **Símbolos:** integrar o emblema original de sol, caminho e folhas no wordmark, no chat e no banner; usar halos e linhas de órbita como detalhes de orientação.
- **Interação:** transições de página e modais suaves, resposta tátil em botões, elevação curta em cartões e microanimação ao concluir hábitos/tarefas. Respeitar `prefers-reduced-motion` e não depender de animação contínua para transmitir informação.
- **Tipografia:** Newsreader para títulos editoriais e Atkinson Hyperlegible para controles e leitura.
- **Essência da marca:** organização pessoal acolhedora que transforma pequenas escolhas diárias em direção constante; personalidade calorosa, curiosa e pé-no-chão.
- **Voz:** direta e gentil, sem promessas absolutas. Exemplos: “Um passo claro já é progresso.”; “O que merece sua atenção agora?”
- **Marca:** wordmark AXIS com o emblema autoral; cor de assinatura cítrica, iluminada por acentos de sol/coral.

## Build, Termux e publicação

O build estático gera `dist/`; o pacote Termux não deve conter chave, `.env` ou `node_modules`. A configuração Vercel mantém `GROQ_API_KEY` apenas no servidor e exige organização gratuita sem faturamento. Nenhuma chamada real de inferência é necessária para build ou testes.

As alterações da interface devem ser enviadas ao `main`; a implantação Vercel publicada automaticamente deve ser verificada antes de concluir.

## Estrutura principal

- `src/components/Navigation.tsx`, `src/pages/DashboardPage.tsx`, `src/styles.css`: marca, navegação, banner e linguagem visual do organizador.
- `src/components/ChatAssistant.tsx`, `src/chat.css`: conversa, consentimento, contexto efêmero e estados de resposta.
- `server/groq-core.mjs`, `server/chat-endpoint.mjs`: validação, integração de chat e mensagens seguras.
- `server/index.mjs`, `vite.config.ts`, `api/chat.js`: servidor local, Preview e Function Vercel.
- `public/images/axis-brand-symbol.webp`: símbolo original otimizado para uso na interface.
- `serve-termux.mjs`, `AXIS-Termux-Guia.md`: execução Android, sem segredo no pacote.
