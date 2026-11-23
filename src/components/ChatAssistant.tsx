import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, Check, ChevronDown, LoaderCircle, MessageCircle, Send, ShieldAlert, Trash2, X } from 'lucide-react';
import '../chat.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatResponse = {
  reply?: unknown;
  error?: unknown;
};

const MAX_MESSAGE_LENGTH = 1600;
const MAX_CONTEXT_MESSAGES = 12;
const PRIVACY_NOTICE = 'Ao enviar, o texto da conversa é processado por um serviço externo de IA. O AXIS não envia seus registros pessoais junto com a mensagem. O serviço informa que não retém pedidos por padrão, mas pode armazená-los temporariamente por até 30 dias em situações limitadas de segurança. Evite informações sensíveis; a conversa desta sessão é apagada ao recarregar a página.';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(',');

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        triggerRef.current?.focus();
      }
      return undefined;
    }

    wasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const initialTarget = hasAcknowledged
        ? inputRef.current
        : dialogRef.current?.querySelector<HTMLInputElement>('.axis-chat-consent-check input');
      (initialTarget ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeDialog, hasAcknowledged, isOpen]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const clearConversation = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsLoading(false);
    setMessages([]);
    setDraft('');
    setError('');
  };

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH || isLoading || !hasAcknowledged) return;

    const userMessage: ChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMessage];
    const context = nextMessages.slice(-MAX_CONTEXT_MESSAGES);
    const controller = new AbortController();
    requestRef.current = controller;
    setMessages(nextMessages);
    setDraft('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: context }),
        signal: controller.signal,
      });

      let data: ChatResponse;
      try {
        data = await response.json() as ChatResponse;
      } catch {
        throw new Error(response.ok ? 'A resposta do chat veio em um formato inesperado. Tente novamente.' : 'Não foi possível concluir o envio. Tente novamente em instantes.');
      }

      if (!response.ok) {
        const serverError = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : '';
        throw new Error(serverError ? `Não foi possível responder: ${serverError}` : 'Não foi possível concluir o envio. Tente novamente em instantes.');
      }
      if (typeof data.reply !== 'string') {
        throw new Error('A resposta do chat veio em um formato inesperado. Tente novamente.');
      }
      setMessages((current) => [...current, { role: 'assistant', content: data.reply as string }]);
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') return;
      setError(caught instanceof TypeError
        ? 'Não foi possível conectar ao chat. Verifique sua conexão e tente novamente.'
        : caught instanceof Error ? caught.message : 'O chat está indisponível no momento. Tente novamente.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="axis-chat-root">
      <button
        ref={triggerRef}
        className="axis-chat-trigger"
        type="button"
        aria-label="Abrir assistente de chat"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle aria-hidden="true" size={21} strokeWidth={1.8} />
        <span>Assistente</span>
      </button>

      {isOpen && (
        <div
          className="axis-chat-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            ref={dialogRef}
            className="axis-chat-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="axis-chat-title"
            aria-describedby="axis-chat-subtitle"
            tabIndex={-1}
          >
            <header className="axis-chat-header">
              <div className="axis-chat-identity">
                <span className="axis-chat-avatar"><Bot aria-hidden="true" size={19} /></span>
                <div className="axis-chat-heading">
                  <p className="axis-chat-kicker">AXIS · CONVERSA</p>
                  <h2 id="axis-chat-title">Assistente</h2>
                  <p id="axis-chat-subtitle" className="axis-chat-subtitle">Pergunte o que quiser</p>
                </div>
              </div>
              <div className="axis-chat-actions">
                <button
                  className="axis-chat-icon-button"
                  type="button"
                  aria-label="Limpar conversa"
                  title="Limpar conversa"
                  onClick={clearConversation}
                  disabled={messages.length === 0 && !draft && !error}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
                <button
                  className="axis-chat-icon-button"
                  type="button"
                  aria-label="Fechar chat"
                  title="Fechar chat"
                  onClick={closeDialog}
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
            </header>

            <div ref={conversationRef} className="axis-chat-conversation" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Mensagens da conversa">
              {messages.length === 0 ? (
                <div className="axis-chat-welcome">
                  <span className="axis-chat-welcome-icon"><MessageCircle aria-hidden="true" size={20} /></span>
                  <p className="axis-chat-welcome-title">Uma conversa, sem atalhos.</p>
                  <p className="axis-chat-welcome-copy">Faça uma pergunta quando estiver pronto. Seus registros do AXIS não são enviados como contexto.</p>
                </div>
              ) : messages.map((message, index) => (
                <article className={`axis-chat-message axis-chat-message-${message.role}`} key={`${index}-${message.role}`}>
                  <span className="axis-chat-message-label">{message.role === 'user' ? 'Você' : 'AXIS'}</span>
                  <p className="axis-chat-message-content">{message.content}</p>
                </article>
              ))}
              {isLoading && (
                <div className="axis-chat-loading" role="status">
                  <LoaderCircle aria-hidden="true" className="axis-chat-spinner" size={15} />
                  <span>Preparando uma resposta…</span>
                </div>
              )}
            </div>

            <div className="axis-chat-compose-area">
              {!hasAcknowledged && (
                <div className="axis-chat-consent">
                  <div className="axis-chat-consent-heading"><ShieldAlert aria-hidden="true" size={15} /><span>Antes de enviar</span></div>
                  <p>{PRIVACY_NOTICE}</p>
                  <label className="axis-chat-consent-check">
                    <input
                      type="checkbox"
                      checked={hasAcknowledged}
                      onChange={(event) => setHasAcknowledged(event.target.checked)}
                    />
                    <span className="axis-chat-checkbox-mark"><Check aria-hidden="true" size={12} /></span>
                    <span>Li e reconheço este aviso.</span>
                  </label>
                </div>
              )}

              {error && <p className="axis-chat-error" role="alert">{error}</p>}

              <form className="axis-chat-form" onSubmit={(event) => void sendMessage(event)}>
                <label className="axis-chat-sr-only" htmlFor="axis-chat-input">Sua mensagem</label>
                <textarea
                  ref={inputRef}
                  id="axis-chat-input"
                  className="axis-chat-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={hasAcknowledged ? 'Escreva sua mensagem…' : 'Reconheça o aviso para começar'}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  disabled={!hasAcknowledged || isLoading}
                  aria-describedby="axis-chat-input-hint axis-chat-char-count"
                />
                <div className="axis-chat-form-footer">
                  <span id="axis-chat-input-hint" className="axis-chat-input-hint">Enter envia · Shift+Enter quebra a linha</span>
                  <span id="axis-chat-char-count" className="axis-chat-char-count" aria-live="off">{draft.length}/{MAX_MESSAGE_LENGTH}</span>
                  <button className="axis-chat-send" type="submit" aria-label="Enviar mensagem" disabled={!hasAcknowledged || isLoading || !draft.trim()}>
                    <Send aria-hidden="true" size={15} />
                  </button>
                </div>
              </form>
              <p className="axis-chat-footnote"><ChevronDown aria-hidden="true" size={12} />A conversa fica apenas nesta sessão; ao recarregar, ela é apagada.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
