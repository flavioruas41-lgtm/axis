# AXIS — sua vida, sua direção

O AXIS é um organizador pessoal em português, construído como PWA com React, TypeScript e Vite. Reúne tarefas, objetivos, projetos, estudos, hábitos, finanças, diário, visão de futuro e uma leitura local da rotina. A interface combina títulos editoriais, tipografia inclusa no app, uma fotografia local no Diário e uma identidade própria para Android/iOS.

## Rodar o projeto

Use Node.js e pnpm. Execute `pnpm install` e depois `pnpm dev`; para validar a versão de produção, rode `pnpm run build`. A compilação gera os arquivos estáticos em `dist/` e coloca JavaScript, CSS e fontes no cache offline da PWA.

## Instalar como aplicativo

A PWA usa Web App Manifest próprio, ícones para Android/iOS e service worker. Para instalação normal, publique em uma origem HTTPS. No Android, abra o endereço no Chrome e escolha “Instalar app” ou “Adicionar à tela inicial”; no iPhone/iPad, abra no Safari e escolha “Adicionar à Tela de Início”. Para executar pelo Termux, use o arquivo `AXIS-Termux.zip` e o guia `AXIS-Termux-Guia.md` entregues separadamente.

## Dados, recuperação e privacidade

Os registros são guardados em `localStorage` no perfil do navegador deste dispositivo. O app não exige conta, não sincroniza entre aparelhos e não envia registros pessoais para um banco ou serviço de análise. O analytics da plataforma deste projeto foi desativado. Como os dados não têm senha nem criptografia própria, alguém com acesso ao mesmo perfil do navegador pode vê-los; limpar os dados do navegador também pode apagá-los.

Em **Minha rotina → Cópia de segurança**, é possível baixar manualmente um arquivo JSON ou importar um backup AXIS versionado. A importação valida estrutura e campos, mostra uma prévia da quantidade de registros e pede confirmação antes de substituir os dados do navegador. O arquivo de backup também é legível e não é criptografado: guarde-o com privacidade. Não há sincronização nem cópia automática.

Se os dados locais não puderem ser lidos, o AXIS não os substitui silenciosamente por uma cópia vazia; a tela avisa que o conteúdo existente foi preservado e oferece a importação de um backup válido.

## Rotina e lembretes

A análise é determinística e local: considera prazos, frequências de hábitos, projetos, sessões de estudo e objetivos já registrados. Edições de tarefas, objetivos, projetos, estudos, hábitos, lançamentos e diário preservam conclusão e histórico de datas. A leitura sugere caminhos, sem editar, excluir ou reagendar informação automaticamente.

O usuário só recebe a solicitação de permissão de notificações depois de tocar em “Ativar”. Os lembretes de tarefa são verificados enquanto o AXIS está aberto; navegador e sistema operacional podem suspender a execução. Sem servidor de push, não há garantia de notificação com o app/navegador fechado ou suspenso.

## Assistente Gemini opcional

O chat usa Gemini 3.8 Flash pela faixa gratuita da Gemini Developer API. Antes do primeiro envio, o painel informa que o Google recebe o histórico curto do chat e que, na faixa gratuita, pode usar esse conteúdo para melhorar produtos. Tarefas, objetivos, hábitos, projetos, estudos, diário, finanças e backups não são anexados nem lidos pelo assistente. A conversa fica apenas na memória da página e é apagada ao recarregar; cada chamada envia `store:false` para não criar um registro de Interactions no servidor do Google. Isso não altera as condições de processamento do Google no nível gratuito.

A chave da API fica somente no ambiente do servidor, nunca no navegador ou no ZIP Termux. O endpoint público tem validação de origem e limites locais por endereço IP, por instância e por dia, mas não exige login; esses limites são proteção oportunista e não são compartilhados entre instâncias. Como qualquer endpoint público, chamadas automatizadas ainda podem consumir a cota gratuita do projeto Google. O AXIS não configura faturamento e não tenta um provedor pago se o Gemini negar ou limitar uma chamada. Confira os termos e limites vigentes na [documentação oficial de preços](https://aistudio.google.com/docs/pricing) e na [visão geral da Interactions API](https://aistudio.google.com/docs/interactions-overview).

## Recursos visuais e acessibilidade

A marca e os ícones têm fallback vetorial local; a foto do Diário, Newsreader, Atkinson Hyperlegible e demais recursos do app ficam no pacote e no cache da PWA. A navegação respeita `prefers-reduced-motion`, os controles essenciais têm rótulos acessíveis e o menu móvel funciona como diálogo com teclado.

As fontes, licenças e créditos visuais estão em [`ASSETS.md`](./ASSETS.md).
