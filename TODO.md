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
- [x] O endpoint de chat publicado não exige login. Limites por IP/instância e validação de origem reduzem abuso, mas não são autenticação nem cota global; chamadas distribuídas ainda podem consumir os limites gratuitos da organização Groq. Os limites de processo reiniciam com as instâncias.

## Transições e interatividade solicitadas — concluído

- [x] Transições de entrada/saída entre páginas do AXIS e feedback de pressão em botões/controles devem ser curtos e coerentes com a identidade editorial, sem animação decorativa permanente.
- [x] Conclusão de tarefas e hábitos e alterações de progresso devem receber feedback visual imediato, mantendo resposta acessível a teclado e toque.
- [x] Todas as animações devem respeitar `prefers-reduced-motion`, sem rolagem suave ou movimento obrigatório quando a opção do sistema estiver ligada.

## Migração do chat para Groq

- [x] O chat opcional usa `openai/gpt-oss-20b` pela API Chat Completions da Groq, sem fallback para serviço pago; erro 429 interrompe a chamada com orientação de limite.
- [x] A interface informa que o texto e o histórico curto são enviados à Groq e que a Groq declara não reter pedidos por padrão, mas pode armazená-los por até 30 dias em circunstâncias limitadas. Não se afirma `store:false` nem ZDR ativo.
- [x] O backend transmite somente o histórico curto textual; tarefas, objetivos, projetos, hábitos, estudos, Diário, Finanças, backups e outros registros locais não são anexados ou consultados.
- [x] A chave `GROQ_API_KEY` é lida somente no servidor/ambiente do Termux; nunca vai ao front-end, bundle, logs, Git ou ZIP.
- [x] O endpoint mantém validação de origem, métodos, payload, limites de tamanho/histórico/tempo, cache `no-store`, erros minimizados e limites best-effort por IP, janela e dia.
- [x] Testes automatizados com mocks (21/21), build TypeScript e inspeção de bundle concluídos sem chamadas reais à Groq; a bundle não contém `GROQ_API_KEY` nem `process.env`.
- [x] ZIP Termux recriado com a interface Groq e sem `.env`, chave, `node_modules` ou referências ao provedor anterior.
- [x] Usuário confirmou organização Groq Free sem faturamento e variável `GROQ_API_KEY` configurada diretamente na Vercel; chave não foi compartilhada no chat.
- [x] `GROQ_API_KEY` configurada como segredo server-side em Preview e Production; código publicado sem expor a chave.
