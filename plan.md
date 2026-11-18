# Plano — Assistente Gemini no AXIS

## Objetivo e decisões aprovadas

Adicionar ao AXIS um chat responsivo em português que usa apenas o Gemini 3.8 Flash na camada gratuita do Google. O usuário foi avisado de que as mensagens são enviadas ao Google e podem ser usadas para melhoria de produtos no Free Tier; confirmou que aceita isso se o chat enviar somente o texto da conversa. Não anexar, consultar nem resumir tarefas, objetivos, projetos, hábitos, estudos, Diário, finanças ou quaisquer registros locais. A conversa permanece apenas durante a sessão do navegador e é explicitamente enviada com `store:false` para não criar histórico de Interactions no servidor do Google. Não configurar faturamento nem fallback pago; quota indisponível resulta em mensagem explicativa.

Manter a identidade editorial existente do AXIS e carregar a ferramenta apenas como painel opcional. O restante do app — armazenamento local, rotinas, funcionamento offline — não depende do Gemini. O chat exige internet e consentimento explícito dentro do painel antes do primeiro envio.

## Arquitetura de aplicação

A UI fica em `src/components/ChatAssistant.tsx`, montada uma única vez no shell de `src/App.tsx` para conservar a conversa durante a navegação entre áreas. `src/chat.css` define o painel acessível e responsivo, sem cobrir a navegação mobile. Mensagens ficam somente em estado React; “Limpar conversa” apaga esse estado. Nenhum provider key nem dado pessoal do AXIS entra no bundle estático.

`server/gemini-core.mjs` valida/normaliza o histórico curto e chama `POST https://generativelanguage.googleapis.com/v1beta/interactions` com o modelo `gemini-3.8-flash`, `store:false`, entrada construída somente dos pares user/assistant do chat, instrução de sistema curta, saída limitada e `thinking_level` baixo. O processo lê `AXIS_GEMINI_API_KEY` somente em runtime. Não armazena nem registra prompts, respostas ou chave; respostas traduzem cota 429, chave/configuração ausente, rede e bloqueios de segurança em mensagens sem conteúdo interno do provedor.

`server/chat-endpoint.mjs` aplica limite de corpo, método, roles, caracteres/histórico e timeout antes de chamar o núcleo; verifica Fetch Metadata/Origin, envia JSON `no-store` e limita chamadas por IP, por minuto e por dia em memória de processo. Esses limites reduzem abuso, mas não são autenticação e não são compartilhados entre processos; as quotas gratuitas do Google permanecem o limite final. `vite.config.ts` reutiliza o endpoint em `/api/chat` no Preview de desenvolvimento. `server/index.mjs` serve esse endpoint, o health check e os arquivos estáticos compilados em produção. A requisição do navegador é same-origin; o servidor não habilita CORS público.

## Build e publicação

O build estático existente continua produzindo `dist/` para o site/PWA. O `Dockerfile` instala o lockfile, compila o front-end e inicia `server/index.mjs`, que honra `PORT` e atende `/_app/health`. O roteamento publicado direciona `/_app/health` e `/api/*` ao container (API com `no-cache`) e o catch-all `/*` ao build estático com fallback SPA. Backend e banco de dados são distintos: habilitar apenas `features.server`, sem ativar ou criar banco.

O Preview só poderá chamar a API após a chave ser cadastrada no escopo de desenvolvimento; a versão publicada requer a mesma chave em produção. Solicitar `AXIS_GEMINI_API_KEY` pelo formulário protegido do projeto, em vez de pedir ou colocar o valor no chat, código, configuração, `.env`, ZIP, logs ou Git. Após a entrega, atualizar o pacote Termux e o guia: o servidor local encaminha `/api/chat` pelo mesmo núcleo e pede a chave interativamente no Termux quando necessário; ela não acompanha o ZIP e não é salva como conteúdo do AXIS.

## Estrutura principal prevista

- `src/components/ChatAssistant.tsx`, `src/chat.css`: experiência acessível, consentimento, contexto efêmero e estados de resposta.
- `server/gemini-core.mjs`, `server/chat-endpoint.mjs`: validação, chamada stateless ao Gemini e erros minimizados.
- `server/index.mjs`, `vite.config.ts`: processo de produção, Preview de desenvolvimento e health check.
- `Dockerfile`: imagem híbrida estática + endpoint.
- `serve-termux.mjs` e `Downloads/AXIS-Termux-Guia.md`: execução equivalente no Android, sem segredo no pacote.
- `TODO.md`: requisitos de produto atualizados; preservar os resultados concluídos das áreas já existentes.
