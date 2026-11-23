# Plano — Assistente Groq no AXIS

## Objetivo e decisões aprovadas

Trocar o provedor do chat opcional do AXIS pelo modelo `openai/gpt-oss-20b` da Groq. A prioridade é não gerar cobrança: usar somente uma organização no nível gratuito, sem habilitar faturamento, sem fallback para outro provedor e com interrupção clara quando a Groq atingir seus limites. A API não deve ser chamada em testes automatizados. O usuário confirmou conta gratuita sem faturamento e segredo server-side `GROQ_API_KEY`; o código foi publicado no `main` sem expor a chave.

Não anexar, consultar nem resumir tarefas, objetivos, projetos, hábitos, estudos, Diário, finanças ou outros registros locais. Somente o histórico curto que o usuário digita no painel pode ser enviado. Não prometer ausência absoluta de retenção no provedor: Chat Completions não aceita `store:false`; a Groq declara que pedidos de inferência não são retidos por padrão, mas podem ser armazenados temporariamente por até 30 dias em circunstâncias limitadas. Não presumir ZDR habilitado.

## Arquitetura de aplicação

A UI permanece em `src/components/ChatAssistant.tsx`, no shell do `src/App.tsx`; mensagens ficam somente em estado React e são apagadas ao recarregar. O aviso de consentimento informa a transmissão à Groq, os limites de retenção publicados e o uso exclusivo da conta gratuita.

`server/groq-core.mjs` valida/normaliza o histórico curto e chama `POST https://api.groq.com/openai/v1/chat/completions` com `openai/gpt-oss-20b`. Envia apenas a instrução de sistema e os pares user/assistant do chat. Lê `GROQ_API_KEY` somente em runtime e não expõe a chave, prompts, respostas ou corpo bruto nos logs. Erros de rede, falta de chave, limite 429 e falhas do provedor viram mensagens seguras; não há fallback.

`server/chat-endpoint.mjs` aplica limite de corpo, método, roles, caracteres/histórico e timeout antes de chamar o núcleo; verifica Fetch Metadata/Origin, envia JSON `no-store` e limita chamadas por IP, por minuto e por dia em memória de processo. Esses limites reduzem abuso, mas não são autenticação nem uma cota global compartilhada entre instâncias. `vite.config.ts` reutiliza o endpoint em `/api/chat` no Preview de desenvolvimento. `server/index.mjs` e `api/chat.js` atendem o mesmo endpoint em produção/Termux. O frontend permanece same-origin e nenhum provedor key entra no bundle.

## Build, Termux e publicação

O build estático existente continua produzindo `dist/`. O servidor Termux pode receber `GROQ_API_KEY` no ambiente da sessão, fora do ZIP e sem salvá-la no armazenamento do AXIS; sem a chave, os demais recursos continuam disponíveis. O guia deve explicar os passos para Termux e ser honesto sobre retenção e limites da Groq.

Para Vercel, configurar `GROQ_API_KEY` somente como segredo server-side em Production e Preview, sem prefixo `VITE_`. Não publicar até o usuário confirmar que a organização está no nível gratuito e que o segredo foi cadastrado na Vercel. Nenhuma chamada real à Groq é necessária ou permitida para as verificações automatizadas.

## Estrutura principal

- `src/components/ChatAssistant.tsx`, `src/chat.css`: experiência acessível, consentimento, contexto efêmero e estados de resposta.
- `server/groq-core.mjs`, `server/chat-endpoint.mjs`: validação, chamada Chat Completions Groq e erros minimizados.
- `server/index.mjs`, `vite.config.ts`, `api/chat.js`: servidor, Preview e Function Vercel.
- `serve-termux.mjs`, `AXIS-Termux-Guia.md`: execução no Android, sem segredo no pacote.
- `README.md`, `README-VERCEL.md`, `TODO.md`: instruções, limites de dados e estado de configuração.
