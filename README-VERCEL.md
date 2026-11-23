# AXIS — pacote para Vercel com Groq

Este pacote adiciona a Function Node.js `api/chat.js` à versão PWA do AXIS. Ela encaminha os pedidos para o endpoint compartilhado do projeto e para a API Chat Completions da Groq, usando `llama-3.1-8b-instant`. O pacote não cria nem publica um projeto Vercel por si só.

## Antes de publicar

O AXIS guarda tarefas, Diário, objetivos, finanças e outros registros no `localStorage` do navegador. Esses dados pertencem à origem atual e não aparecem automaticamente em um domínio Vercel. Antes de trocar de endereço, exporte um backup em **Minha rotina → Cópia de segurança**. Depois, importe esse arquivo manualmente no novo domínio. A conversa do chat não é incluída no backup.

Para manter o uso sem cobrança, confirme primeiro no console da Groq que a chave pertence a uma organização no nível gratuito, e não habilite faturamento nem cadastre um método de pagamento para esta integração. Se a conta pedir ativação de plano pago para emitir a chave ou usar o modelo, interrompa a configuração. O código não tem fallback pago, mas não consegue substituir as configurações de faturamento da conta do provedor.

## Configuração da Vercel

Extraia o ZIP e conecte a pasta extraída à Vercel pelo Git ou pela CLI. Use a raiz extraída como raiz do projeto. O projeto usa Vite: mantenha o build `pnpm run build` e a saída estática `dist/`. O arquivo `vercel.json` registra o fallback SPA e configura `/api/chat` como uma Function Node.js, com duração máxima de 60 segundos e cancelamento ao desconectar o cliente.

Na Vercel, abra **Project Settings → Environment Variables** e crie `GROQ_API_KEY` como variável secreta para **Production** e **Preview**. Não use o prefixo `VITE_`: a chave precisa continuar disponível apenas no servidor e não pode entrar no bundle do navegador. Depois de salvar a variável, faça um novo deploy para que a Function receba o valor. Nunca cole a chave neste arquivo, no ZIP, no código-fonte ou no chat. Não publique antes de confirmar a organização Groq Free e configurar o segredo no projeto Vercel.

A Function recebe apenas o histórico curto e validado do chat; ela não recebe tarefas nem outros registros locais. Cada chamada usa o endpoint Chat Completions da Groq, sem campos de estado como `store` (esse parâmetro não é suportado pela API). O AXIS não salva a conversa no servidor da aplicação. A Groq informa que pedidos de inferência não são retidos por padrão, mas pode haver armazenamento temporário de até 30 dias em circunstâncias limitadas de confiabilidade/investigação de abuso. A configuração ZDR, caso disponível para a organização, não foi confirmada como ativa.

## Verificações locais

Com Node.js e pnpm instalados, execute na raiz extraída:

```sh
pnpm install --frozen-lockfile
pnpm test:server
pnpm run build
```

Essas verificações usam apenas mocks e não enviam mensagens reais à Groq. Não teste a integração com chamadas reais até confirmar que a organização está no nível gratuito, sem faturamento. Quando autorizada e configurada, a chamada é feita pelo próprio chat e consome limites da conta Groq.

## Limites importantes

O endpoint é público e não exige conta AXIS. Os limitadores em memória são locais à instância e uma barreira oportunista, não autenticação nem limite global garantido. Chamadas automatizadas podem consumir a cota da organização; no nível gratuito, a Groq pode recusar pedidos quando os limites forem atingidos. O AXIS não configura faturamento e não tenta um provedor pago.

Em falhas do provedor, rede ou formato de resposta, o chat mostra um código `AXIS-GROQ-*` para facilitar o diagnóstico. Os logs registram somente metadados técnicos, como status HTTP, categoria ou código seguro da Groq; não registram a mensagem enviada, o corpo da resposta do provedor nem a chave.

A Vercel e a Groq são provedores distintos: esta configuração muda onde o frontend e a Function são servidos; não altera a chave, os limites ou as políticas de dados da Groq. Consulte os limites efetivos da sua organização antes de ativar o chat.

Documentação: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Funções Node.js](https://vercel.com/docs/functions/runtimes/node-js), [variáveis de ambiente](https://vercel.com/docs/environment-variables), [modelo llama-3.1-8b-instant](https://console.groq.com/docs/model/llama-3.1-8b-instant), [limites Groq](https://console.groq.com/docs/rate-limits) e [dados Groq](https://console.groq.com/docs/your-data).
