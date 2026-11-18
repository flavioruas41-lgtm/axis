# AXIS — pacote para Vercel com Gemini

Este pacote adiciona a Function Node.js `api/chat.js` à versão PWA do AXIS. Ela encaminha os pedidos para o mesmo validador e para o mesmo núcleo stateless Gemini usados pelo servidor atual. O pacote não cria nem publica um projeto Vercel por si só.

## Antes de publicar

O AXIS guarda tarefas, Diário, objetivos, finanças e outros registros no `localStorage` do navegador. Esses dados pertencem à origem atual e não aparecem automaticamente em um domínio Vercel. Antes de trocar de endereço, exporte um backup em **Minha rotina → Cópia de segurança**. Depois, importe esse arquivo manualmente no novo domínio. A conversa do Gemini não é incluída no backup.

## Configuração da Vercel

Extraia o ZIP e conecte a pasta extraída à Vercel pelo Git ou pela CLI. Use a raiz extraída como raiz do projeto. O projeto usa Vite: mantenha o build `pnpm run build` e a saída estática `dist/`. O arquivo `vercel.json` registra o fallback SPA e configura `/api/chat` como uma Function Node.js, com duração máxima de 60 segundos e cancelamento ao desconectar o cliente.

Na Vercel, abra **Project Settings → Environment Variables** e crie `AXIS_GEMINI_API_KEY` como variável secreta para **Production** e **Preview**. Não use o prefixo `VITE_`: a chave precisa continuar disponível apenas no servidor e não pode entrar no bundle do navegador. Depois de salvar a variável, faça um novo deploy para que a Function receba o valor. Nunca cole a chave neste arquivo, no ZIP, no código-fonte ou no chat.

A Function recebe o corpo JSON da Vercel, adapta-o ao leitor de stream do endpoint existente e mantém as validações de formato, origem, limites, tamanho e histórico. Ela não recebe tarefas ou outros registros locais. Cada chamada ao Google contém somente o histórico curto de texto do chat e define `store:false`. No nível gratuito do Google, o provedor pode usar o conteúdo para melhorar produtos, conforme o aviso de privacidade exibido no chat.

## Verificações locais

Com Node.js e pnpm instalados, execute na raiz extraída:

```sh
pnpm install --frozen-lockfile
pnpm test:server
pnpm run build
```

Essas verificações não enviam mensagens reais ao Gemini. Para testar o serviço depois de configurar a chave, use o próprio chat e envie somente o texto que deseja compartilhar com o Google. O teste consome a cota gratuita do projeto.

## Limites importantes

O endpoint é público e não exige conta AXIS. Os limitadores em memória são locais à instância e são uma barreira oportunista, não uma autenticação nem um limite global garantido. Uma chamada automatizada ainda pode consumir a cota do projeto Google. O AXIS não configura faturamento e não faz fallback para um serviço pago.

Em falhas do provedor, rede ou formato de resposta, o chat mostra um código `AXIS-GEMINI-*` para facilitar o diagnóstico. Os logs registram somente metadados técnicos, como status HTTP, categoria ou código seguro do Google; não registram a mensagem enviada, o corpo da resposta do provedor nem a chave.

A Vercel e o Gemini são provedores distintos: esta configuração muda onde o frontend e a Function são servidos; não altera a chave, os limites ou as políticas de dados do Google. A migração pode evitar o caminho do gateway Manus, mas o ZIP não garante que todo erro de publicação ou de provedor desaparecerá.

Documentação: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Funções Node.js](https://vercel.com/docs/functions/runtimes/node-js), [variáveis de ambiente](https://vercel.com/docs/environment-variables) e [limites de duração](https://vercel.com/docs/functions/limitations).
