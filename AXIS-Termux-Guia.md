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

O chat é opcional. Para usá-lo sem cobrança, confirme primeiro que sua organização da Groq está no nível gratuito e sem faturamento habilitado. Não adicione método de pagamento para esta integração; se o console exigir plano pago, não prossiga. Obtenha uma chave da API Groq e informe-a apenas no ambiente desta sessão do Termux — a entrada fica oculta e não é gravada no ZIP nem nos registros locais do AXIS:

```sh
read -s -p "Chave GROQ_API_KEY da conta gratuita (Enter para não usar o chat): " GROQ_API_KEY
export GROQ_API_KEY
printf '\n'
node serve-termux.mjs
```

Se não quiser usar o chat, pressione Enter sem informar uma chave; as demais áreas continuam disponíveis. O servidor informa quando está pronto em `http://127.0.0.1:3000`. Mantenha a sessão do Termux aberta. Ao parar o servidor com `Ctrl+C`, remova a chave do ambiente do shell:

```sh
unset GROQ_API_KEY
```

A chave precisa estar disponível no ambiente de cada sessão do Termux em que o chat for usado. O arquivo ZIP não inclui chave, `.env` nem credenciais.

## Abrir e instalar como PWA

No mesmo celular, abra o Chrome e acesse `http://127.0.0.1:3000`. No menu ⋮, escolha **Instalar app** ou **Adicionar à tela inicial**. A primeira abertura deve acontecer enquanto o servidor está ligado; depois, o service worker mantém a interface e os recursos locais disponíveis conforme o cache do navegador. O chat exige internet e o servidor Termux ativo; as demais áreas locais continuam independentes dele.

## Privacidade e limites do chat

Antes do primeiro envio, o AXIS informa que o texto e o histórico curto da conversa são enviados à Groq para gerar respostas. A Groq declara que não retém pedidos de inferência por padrão, mas pode armazená-los temporariamente por até 30 dias em situações limitadas de confiabilidade ou investigação de abuso. Não foi confirmado que ZDR esteja ativado para a sua organização. Tarefas, objetivos, hábitos, projetos, estudos, diário, finanças e backups não são enviados. A conversa fica somente na memória da página e desaparece ao recarregar; a referência da API marca `store` como não suportado, então o AXIS não envia esse campo nem promete ausência de retenção pelo provedor.

Não envie informações sensíveis no chat. A chave fica apenas na variável de ambiente do Termux enquanto o servidor está ativo, não no código ou no armazenamento local do AXIS. Os limites gratuitos variam por organização e modelo; quando a Groq recusar pedidos por cota/limite, o AXIS para e não troca para serviço pago. O código não habilita faturamento; a garantia de não cobrança depende de usar uma organização gratuita sem faturamento. Consulte os [preços](https://groq.com/pricing), [limites](https://console.groq.com/docs/rate-limits) e [controles de dados](https://console.groq.com/docs/your-data) da Groq.

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
- [Groq — modelo llama-3.1-8b-instant](https://console.groq.com/docs/model/llama-3.1-8b-instant)
- [Groq — limites de uso](https://console.groq.com/docs/rate-limits)
- [Groq — privacidade e retenção](https://console.groq.com/docs/your-data)
