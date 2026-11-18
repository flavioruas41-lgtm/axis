# AXIS — estado do projeto

## Aplicativo e marca

- [x] PWA responsiva em português, com identidade AXIS original, símbolo vetorial local, ícones Android/iOS e fallback offline.
- [x] Direção editorial com Newsreader para títulos e Atkinson Hyperlegible para interface; as fontes estão no build e não dependem de carregamento externo.
- [x] Fotografia licenciada do Diário otimizada em WebP e incluída no app. O bokeh antigo foi removido.
- [x] Movimento reduzido respeitado no CSS e em ações JavaScript; alvos de toque, foco, navegação e rótulos de controles revisados para mobile.

## Rotina e registros

- [x] Dashboard diferencia tarefas em aberto de prazos de hoje e ordena itens atrasados/urgentes; é possível marcar tarefas e hábitos rapidamente.
- [x] Tarefas, objetivos, projetos, sessões de estudo, hábitos, lançamentos e diário podem ser editados sem apagar conclusão ou histórico relevante.
- [x] Estudos têm busca e períodos; Financeiro tem busca, tipo e período; Diário tem busca, período e edição.
- [x] Hábitos exibem os últimos sete dias e permitem corrigir a marcação de cada data.
- [x] Menu “Mais” mobile abre como diálogo acessível, com ciclo de foco, Escape, retorno do foco e estado atual anunciado.
- [x] A análise local continua determinística, usa apenas dados registrados e não altera registros por conta própria.

## Persistência, recuperação e segurança

- [x] Dados permanecem em armazenamento local do perfil do navegador, sem conta, sync, banco remoto ou envio da rotina.
- [x] Uma leitura de dados corrompidos não sobrescreve automaticamente o conteúdo existente; o app oferece importação e, se o usuário não tiver backup, descarte só após confirmação explícita.
- [x] Backup JSON versionado verifica tipos, campos, datas e tamanho; mostra prévia/contagens e substitui registros somente após a ação de restauração.
- [x] Limitações de privacidade são informadas: arquivos e registros não têm senha ou criptografia própria.
- [x] Fontes, fotografia e ícones/fallbacks documentados em `ASSETS.md`.

## Build e entrega

- [x] TypeScript, build de produção, service worker, manifest e `git diff --check` validados.
- [x] Serialização/validação de backup testada para export/import, versão errada, data impossível e limite de tamanho.
- [x] Dashboard visual revisado em 1440 px e 390 px.
- [x] ZIP Termux atualizado e extraído/testado com o servidor Node.js, preservando o fluxo de instalação PWA por `localhost`.

## Limites conhecidos

- [x] A PWA não é um APK nativo. No Termux, o servidor precisa permanecer aberto para servir o app.
- [x] Sem servidor de push, lembretes não têm garantia com app/navegador fechado ou suspenso.
- [x] O backup manual é legível e não criptografado; deve ser guardado privadamente.
- [x] O endpoint de chat publicado não exige login. Limites por IP/instância e validação de origem reduzem abuso, mas não são autenticação; chamadas distribuídas ainda podem consumir a cota gratuita do projeto Google. Os limites de processo reiniciam com as instâncias.

## Transições e interatividade solicitadas — concluído

- [x] Transições de entrada/saída entre páginas do AXIS e feedback de pressão em botões/controles devem ser curtos e coerentes com a identidade editorial, sem animação decorativa permanente.
- [x] Conclusão de tarefas e hábitos e alterações de progresso devem receber feedback visual imediato, mantendo resposta acessível a teclado e toque.
- [x] Todas as animações devem respeitar `prefers-reduced-motion`, sem rolagem suave ou movimento obrigatório quando a opção do sistema estiver ligada.

## Chat opcional Gemini — concluído

- [x] Incluir um chat em português, acessível em desktop e celular, com botão Assistente, diálogo acessível, envio por botão/Enter, Shift+Enter para nova linha, estados de carregamento/resposta/erro e opção de limpar. A conversa existe apenas na sessão do navegador.
- [x] Usar somente `gemini-3.8-flash` pela Gemini Interactions API no plano gratuito, sem configurar faturamento, sem fallback pago e com explicação quando a cota Google estiver indisponível; tratar HTTP 429 sem tentar outra rota paga. A faixa de uso efetiva depende da configuração do projeto Google vinculado à chave.
- [x] Antes do primeiro envio, informar que somente o texto da conversa será transmitido ao Google; no nível gratuito, o Google pode usar esse conteúdo para melhorar produtos; não incentivar o envio de dados sensíveis. O usuário confirmou que aceita essas condições.
- [x] Não anexar ou consultar automaticamente tarefas, objetivos, projetos, hábitos, Estudos, Diário, Finanças, backups ou outros registros locais do AXIS. A API recebe apenas o histórico curto digitado/gerado dentro do painel do chat.
- [x] Solicitar `store:false` em cada Interactions API para não manter o histórico do chat no armazenamento server-side do Google; não persistir conversas no armazenamento local do AXIS.
- [x] Guardar a chave `AXIS_GEMINI_API_KEY` somente como segredo em runtime do servidor. Nunca colocá-la no front-end, HTML, bundle estático, logs, `.env` versionado, Git ou ZIP do Termux.
- [x] Validar método, JSON, papéis e limites de mensagem/histórico/tamanho/tempo no backend. Respostas usam `Cache-Control: no-store`; o servidor não registra prompts, saídas ou chaves; erros não expõem detalhes internos.
- [x] Preservar armazenamento local e operação offline das demais áreas. O chat é opcional, depende de internet e só processa o conteúdo que a pessoa envia no chat.
- [x] Configurar a publicação de `/api/chat` somente no backend server-side; o Preview e o servidor da produção usam a mesma lógica e erros compreensíveis, sem enviar a chave ao navegador.
- [x] Atualizar o fluxo de Termux para receber a chave de modo interativo fora do ZIP, encaminhar `/api/chat` pelo mesmo módulo server-side e nunca incluí-la no pacote.
- [x] Validar build TypeScript/híbrido, endpoint, payload stateless sem retenção, segredo ausente/errado e limites/429. Atualizar e testar o ZIP `AXIS-Termux.zip` e o guia após a integração.
