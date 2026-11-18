# AXIS no Android pelo Termux

Este ZIP leva o código do AXIS, o build PWA e o servidor Node.js com a rota local `/api/chat`. **Não é um APK nativo**: o Termux serve o app em `127.0.0.1`, e a instalação na tela inicial é feita pelo Chrome. Não é preciso instalar pnpm nem compilar no celular. As áreas pessoais continuam guardadas no armazenamento local do perfil do navegador.

## Instalação inicial

Instale o Termux pela [página oficial no F-Droid](https://f-droid.org/en/packages/com.termux/) ou pelos [releases oficiais no GitHub](https://github.com/termux/termux-app). Evite misturar versões instaladas de fontes diferentes, porque as assinaturas podem ser incompatíveis.

Baixe `AXIS-Termux.zip` para a pasta **Downloads** do Android. Abra o Termux e rode:

```sh
termux-setup-storage
pkg update && pkg upgrade -y
pkg install nodejs-lts unzip
mkdir -p ~/axis-termux
unzip -o ~/storage/downloads/AXIS-Termux.zip -d ~/axis-termux
cd ~/axis-termux
node --version
```

Para ativar o chat opcional, obtenha uma chave Gemini em um projeto da Gemini Developer API que permaneça na faixa gratuita. O AXIS não habilita faturamento. No Termux, cole a chave quando solicitado; a entrada fica oculta e não é gravada no ZIP nem nos registros locais do AXIS:

```sh
read -s -p "Chave Gemini gratuita (Enter para não usar o chat): " AXIS_GEMINI_API_KEY
export AXIS_GEMINI_API_KEY
printf '\n'
node serve-termux.mjs
```

Se não quiser usar o chat, pressione Enter sem informar uma chave; as demais áreas continuam disponíveis. O servidor informa quando está pronto em `http://127.0.0.1:3000`. Mantenha a sessão do Termux aberta. Ao parar o servidor com `Ctrl+C`, a linha seguinte remove a chave do ambiente do shell:

```sh
unset AXIS_GEMINI_API_KEY
```

A chave precisa estar disponível no ambiente de cada sessão do Termux em que o chat for usado. O arquivo ZIP não inclui chave, `.env` nem credenciais.

## Abrir e instalar como PWA

No mesmo celular, abra o Chrome e acesse `http://127.0.0.1:3000`. No menu ⋮, escolha **Instalar app** ou **Adicionar à tela inicial**. A primeira abertura deve acontecer enquanto o servidor está ligado; depois, o service worker mantém a interface e os recursos locais disponíveis conforme o cache do navegador. O chat exige internet e o servidor Termux ativo; as demais áreas locais continuam independentes dele.

## Privacidade e limites do chat

Antes do primeiro envio, o AXIS informa que o texto e o histórico curto da conversa são enviados ao Google Gemini para gerar respostas. No nível gratuito, o Google pode usar esse conteúdo para melhorar produtos. Tarefas, objetivos, hábitos, projetos, estudos, diário, finanças e backups não são enviados. A conversa fica somente na memória da página, desaparece ao recarregar e cada chamada usa `store:false`.

Não envie informações sensíveis no chat. A chave fica apenas na variável de ambiente do Termux enquanto o servidor está ativo, não no código ou no armazenamento local do AXIS. A cota gratuita do Google pode ser limitada; o AXIS não troca para um serviço pago quando a cota acaba. Consulte os [preços e condições atuais do Google](https://aistudio.google.com/docs/pricing).

## Atualizar de um ZIP anterior

Pare primeiro o servidor antigo com `Ctrl+C`. Descompacte o novo ZIP sobre a mesma pasta:

```sh
unzip -o ~/storage/downloads/AXIS-Termux.zip -d ~/axis-termux
cd ~/axis-termux
```

Se quiser usar o chat nessa sessão, informe a chave novamente com `read -s` antes de iniciar o servidor. Depois execute:

```sh
node serve-termux.mjs
```

A atualização não apaga os dados locais do Chrome. Mantenha o endereço `http://127.0.0.1:3000`; se a porta 3000 estiver ocupada, use `AXIS_PORT=3001 node serve-termux.mjs` e abra `http://127.0.0.1:3001`. Uma porta diferente cria um armazenamento local separado no navegador.

Os lembretes são verificados enquanto o AXIS permanece aberto. Como esta versão não usa servidor de push, o Android ou o navegador podem suspender as notificações em segundo plano.

## Fontes oficiais

- [Termux — instalação e informações do aplicativo](https://github.com/termux/termux-app)
- [Termux — pacote Node.js](https://wiki.termux.com/wiki/Node.js)
- [Termux no F-Droid](https://f-droid.org/en/packages/com.termux/)
- [Gemini Developer API — preços](https://aistudio.google.com/docs/pricing)
- [Gemini Interactions API — modo stateless](https://aistudio.google.com/docs/interactions-overview)
